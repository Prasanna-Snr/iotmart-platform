from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.models import ProductReview, Product
from app.security import get_current_admin

router = APIRouter()


class ReviewAdminOut(BaseModel):
    id: UUID
    product_id: UUID
    user_id: UUID
    user_name: str
    user_avatar: str | None = None
    rating: int
    title: str
    body: str
    verified: bool
    created_at: datetime
    product_name: str = ""
    product_slug: str = ""
    model_config = {"from_attributes": True}


def to_out(r: ProductReview) -> ReviewAdminOut:
    out = ReviewAdminOut.model_validate(r)
    out.product_name = r.product.name if r.product else ""
    out.product_slug = r.product.slug if r.product else ""
    return out


@router.get("", response_model=list[ReviewAdminOut])
async def list_reviews(
    db: AsyncSession = Depends(get_db),
    verified: bool | None = Query(None),
    search: str | None = Query(None),
    _=Depends(get_current_admin),
):
    q = select(ProductReview).options(selectinload(ProductReview.product))
    conditions = []
    if verified is not None:
        conditions.append(ProductReview.verified == verified)
    if search:
        conditions.append(ProductReview.user_name.ilike(f"%{search}%"))
    if conditions:
        q = q.where(*conditions)
    q = q.order_by(ProductReview.created_at.desc())
    reviews = (await db.execute(q)).scalars().all()
    return [to_out(r) for r in reviews]


@router.patch("/{id}/verify", response_model=ReviewAdminOut)
async def toggle_verify(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    review = (await db.execute(
        select(ProductReview).options(selectinload(ProductReview.product)).where(ProductReview.id == id)
    )).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.verified = not review.verified
    await db.flush()
    return to_out(review)


@router.delete("/{id}", status_code=204)
async def delete_review(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    review = (await db.execute(
        select(ProductReview).where(ProductReview.id == id)
    )).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    product = (await db.execute(
        select(Product).where(Product.id == review.product_id)
    )).scalar_one_or_none()
    await db.delete(review)
    await db.flush()
    # Recalculate product rating after deletion
    if product:
        remaining = (await db.execute(
            select(ProductReview).where(ProductReview.product_id == product.id)
        )).scalars().all()
        product.review_count = len(remaining)
        product.rating = round(sum(r.rating for r in remaining) / len(remaining), 2) if remaining else 0.0

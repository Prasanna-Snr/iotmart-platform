from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.models import ProductReview, Product, User
from app.schemas.products import ReviewOut
from app.security import get_current_admin, get_current_user
from app.audit import record as audit

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


class ReviewUpdate(BaseModel):
    """Customer edits their own review (rating/title/body)."""
    rating: int | None = None
    title: str | None = None
    body: str | None = None


def to_out(r: ProductReview) -> ReviewAdminOut:
    out = ReviewAdminOut.model_validate(r)
    out.product_name = r.product.name if r.product else ""
    out.product_slug = r.product.slug if r.product else ""
    return out


async def _recalc_rating(db: AsyncSession, product_id) -> None:
    """Recompute a product's average rating + review_count after edits."""
    ratings = [
        r[0]
        for r in (
            await db.execute(
                select(ProductReview.rating).where(ProductReview.product_id == product_id)
            )
        ).all()
    ]
    product = (await db.execute(
        select(Product).where(Product.id == product_id)
    )).scalar_one_or_none()
    if not product:
        return
    product.rating = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
    product.review_count = len(ratings)


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


@router.patch("/{id}", response_model=ReviewOut)
async def update_review(
    id: str,
    body: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Let the author (or an admin) edit a review. Rating is recomputed."""
    review = (await db.execute(
        select(ProductReview).where(ProductReview.id == id)
    )).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if str(review.user_id) != str(current.id) and current.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(review, field, value)
    await db.flush()
    await _recalc_rating(db, review.product_id)
    await audit(db, current, "review.update", "review", review.id, str(review.product_id))
    return ReviewOut.model_validate(review)


@router.patch("/{id}/verify", response_model=ReviewAdminOut)
async def toggle_verify(id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    review = (await db.execute(
        select(ProductReview).options(selectinload(ProductReview.product)).where(ProductReview.id == id)
    )).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.verified = not review.verified
    await db.flush()
    await audit(db, admin, "review.verify", "review", review.id,
                f"verified={review.verified} on product {review.product_id}")
    return to_out(review)


@router.delete("/{id}", status_code=204)
async def delete_review(id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    review = (await db.execute(
        select(ProductReview).where(ProductReview.id == id)
    )).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await audit(db, admin, "review.delete", "review", review.id, str(review.product_id))
    await db.delete(review)
    await db.flush()
    # Recalculate product rating after deletion
    await _recalc_rating(db, review.product_id)

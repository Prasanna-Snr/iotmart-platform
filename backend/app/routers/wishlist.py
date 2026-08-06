from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import User, WishlistItem, Product
from app.schemas.wishlist import WishlistItemOut
from app.security import get_current_user

router = APIRouter()

_PRODUCT_LOADS = (
    selectinload(WishlistItem.product).selectinload(Product.category),
    selectinload(WishlistItem.product).selectinload(Product.brand),
    selectinload(WishlistItem.product).selectinload(Product.reviews),
)


@router.get("", response_model=list[WishlistItemOut])
async def list_wishlist(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == current.id)
        .options(*_PRODUCT_LOADS)
        .order_by(WishlistItem.created_at.desc())
    )
    return [WishlistItemOut.model_validate(w) for w in result.scalars().all()]


@router.post("/{product_id}", response_model=WishlistItemOut, status_code=201)
async def add_to_wishlist(product_id: str, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    product = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = (await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == current.id,
            WishlistItem.product_id == product_id,
        )
    )).scalar_one_or_none()
    if existing:
        refreshed = (await db.execute(
            select(WishlistItem).where(WishlistItem.id == existing.id).options(*_PRODUCT_LOADS)
        )).scalar_one()
        return WishlistItemOut.model_validate(refreshed)
    item = WishlistItem(user_id=current.id, product_id=product_id)
    db.add(item)
    await db.flush()
    await db.refresh(item, attribute_names=["product"])
    refreshed = (await db.execute(
        select(WishlistItem).where(WishlistItem.id == item.id).options(*_PRODUCT_LOADS)
    )).scalar_one()
    return WishlistItemOut.model_validate(refreshed)


@router.delete("/{product_id}", status_code=204)
async def remove_from_wishlist(product_id: str, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    await db.execute(delete(WishlistItem).where(
        WishlistItem.user_id == current.id,
        WishlistItem.product_id == product_id,
    ))

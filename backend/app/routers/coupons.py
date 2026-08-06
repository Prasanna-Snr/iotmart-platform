from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record as audit
from app.coupons import compute_discount, validate_coupon
from app.database import get_db
from app.limiter import limiter
from app.models.models import Coupon
from app.schemas.coupons import CouponCreate, CouponOut, CouponUpdate
from app.security import get_current_admin

router = APIRouter()


class ValidateIn(BaseModel):
    code: str
    subtotal: float


@router.get("", response_model=list[CouponOut])
async def list_coupons(db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    result = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    return [CouponOut.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CouponOut, status_code=201)
async def create_coupon(body: CouponCreate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    coupon = Coupon(**body.model_dump())
    db.add(coupon)
    await db.flush()
    await audit(db, admin, "coupon.create", "coupon", coupon.id, coupon.code)
    return CouponOut.model_validate(coupon)


@router.put("/{id}", response_model=CouponOut)
async def update_coupon(id: str, body: CouponUpdate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    coupon = (await db.execute(select(Coupon).where(Coupon.id == id))).scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    data = body.model_dump(exclude_none=True)
    if "percent_off" in data:
        data["fixed_amount"] = None
    if "fixed_amount" in data:
        data["percent_off"] = None
    for field, value in data.items():
        setattr(coupon, field, value)
    await audit(db, admin, "coupon.update", "coupon", coupon.id, coupon.code)
    return CouponOut.model_validate(coupon)


@router.delete("/{id}", status_code=204)
async def delete_coupon(id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    coupon = (await db.execute(select(Coupon).where(Coupon.id == id))).scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    await audit(db, admin, "coupon.delete", "coupon", coupon.id, coupon.code)
    await db.delete(coupon)


@router.post("/validate")
@limiter.limit("30/hour")
async def validate_coupon_code(
    request: Request,  # required by slowapi
    body: ValidateIn,
    db: AsyncSession = Depends(get_db),
):
    """Public coupon check used by the checkout.

    Always returns HTTP 200 so the checkout can render the message inline:
    ``{"valid": true, "discount": d, "code": c}`` on success, or
    ``{"valid": false, "message": "..."}`` on failure.  Never increments
    ``used_count`` — that only happens when an order is actually placed.
    """
    try:
        coupon = await validate_coupon(db, body.code, None, body.subtotal)
    except HTTPException as e:
        return {"valid": False, "message": e.detail}
    discount = compute_discount(coupon, body.subtotal)
    return {"valid": True, "discount": discount, "code": coupon.code}

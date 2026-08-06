"""Coupon discount logic.

Pure helpers shared between the public validate endpoint and order
creation.  Nothing here touches the HTTP layer except the HTTPException
raised by :func:`validate_coupon` (caught and flattened to a 200
``{"valid": false, ...}`` response by the router).
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select

from app.models.models import Coupon, Order


def compute_discount(coupon, subtotal: float) -> float:
    """Compute the discount a coupon applies to ``subtotal``.

    Percent coupons take ``subtotal * percent_off / 100``; fixed coupons
    are capped at the subtotal.  The result is clamped to ``[0, subtotal]``
    so a coupon can never produce a negative amount or push an order total
    below zero.
    """
    if coupon.percent_off is not None:
        discount = round(subtotal * coupon.percent_off / 100, 2)
    elif coupon.fixed_amount is not None:
        discount = min(coupon.fixed_amount, subtotal)
    else:
        discount = 0.0
    discount = max(0.0, discount)
    discount = min(discount, subtotal)
    return round(discount, 2)


async def validate_coupon(db, code: str, user_id, subtotal: float) -> Coupon:
    """Validate a coupon code and return the matching ``Coupon`` row.

    Raises ``HTTPException`` for every failure mode so callers can rely on
    ``e.detail`` as the user-facing message.  The code lookup is
    case-insensitive.
    """
    code = (code or "").strip().lower()
    coupon = (await db.execute(
        select(Coupon).where(func.lower(Coupon.code) == code)
    )).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if not coupon or not coupon.active:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon code")
    if coupon.starts_at and coupon.starts_at > now:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon code")
    if coupon.expires_at and coupon.expires_at < now:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon code")
    if subtotal < coupon.min_subtotal:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum subtotal of {coupon.min_subtotal:g} required for this coupon",
        )
    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=409, detail="This coupon has reached its usage limit")
    if coupon.max_uses_per_user is not None and user_id is not None:
        used_by_user = (await db.execute(
            select(func.count()).select_from(Order).where(
                Order.coupon_code == coupon.code,
                Order.user_id == user_id,
            )
        )).scalar_one()
        if used_by_user >= coupon.max_uses_per_user:
            raise HTTPException(status_code=409, detail="You have already used this coupon")
    return coupon


async def apply_coupon(db, code: str, user_id, subtotal: float) -> tuple[float, str]:
    """Validate a coupon and consume one use of it.

    Returns ``(discount, code)``.  Increments ``coupon.used_count``; the
    caller is responsible for flushing (the shared ``get_db`` dependency
    commits at the end of the request).
    """
    coupon = await validate_coupon(db, code, user_id, subtotal)
    discount = compute_discount(coupon, subtotal)
    coupon.used_count += 1
    return discount, coupon.code

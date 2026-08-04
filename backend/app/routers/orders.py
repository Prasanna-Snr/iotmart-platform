import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import Order, User
from app.schemas.orders import OrderCreate, OrderStatusUpdate, OrderOut
from app.security import get_current_user, get_current_admin

router = APIRouter()

VALID_STATUSES = {"pending", "processing", "delivered", "cancelled"}


def gen_order_number() -> str:
    return "ORD-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


@router.get("", response_model=list[OrderOut])
async def list_orders(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    if current.role == "admin":
        result = await db.execute(select(Order).order_by(Order.created_at.desc()))
    else:
        result = await db.execute(select(Order).where(Order.user_id == current.id).order_by(Order.created_at.desc()))
    return [OrderOut.model_validate(o) for o in result.scalars().all()]


@router.get("/{id}", response_model=OrderOut)
async def get_order(id: str, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    order = (await db.execute(select(Order).where(Order.id == id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current.role != "admin" and str(order.user_id) != str(current.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return OrderOut.model_validate(order)


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(body: OrderCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    from app.models.models import SiteSettings

    # Read shipping config from site_settings (fall back to safe defaults)
    async def get_setting(key: str, default: str) -> str:
        row = (await db.execute(select(SiteSettings).where(SiteSettings.key == key))).scalar_one_or_none()
        return row.value if row else default

    free_threshold = float(await get_setting("shipping_free_threshold", "5000"))
    default_cost   = float(await get_setting("shipping_default_cost", "100"))

    items = [i.model_dump() for i in body.items]
    subtotal = round(sum(i["subtotal"] for i in items), 2)
    shipping_cost = 0.0 if subtotal >= free_threshold else default_cost
    total = round(subtotal + shipping_cost, 2)
    order = Order(
        order_number=gen_order_number(),
        user_id=current.id,
        customer_email=current.email,
        items=items,
        shipping_address=body.shipping_address.model_dump(),
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        total=total,
        payment_method=body.payment_method,
        payment_status="pending",
        notes=body.notes,
    )
    db.add(order)
    await db.flush()
    return OrderOut.model_validate(order)


@router.patch("/{id}/cancel", response_model=OrderOut)
async def cancel_order(id: str, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    order = (await db.execute(select(Order).where(Order.id == id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.user_id) != str(current.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")
    order.status = "cancelled"
    return OrderOut.model_validate(order)


@router.patch("/{id}/status", response_model=OrderOut)
async def update_order_status(id: str, body: OrderStatusUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {sorted(VALID_STATUSES)}")
    order = (await db.execute(select(Order).where(Order.id == id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = body.status
    if body.status == "delivered":
        order.payment_status = "paid"
    return OrderOut.model_validate(order)

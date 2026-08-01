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

VALID_STATUSES = {"pending", "processing", "shipped", "delivered", "cancelled", "refunded"}


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
    items = [i.model_dump() for i in body.items]
    subtotal = round(sum(i["subtotal"] for i in items), 2)
    shipping_cost = 0.0 if subtotal >= 50 else 5.99
    tax = round(subtotal * 0.08, 2)
    total = round(subtotal + shipping_cost + tax, 2)
    order = Order(
        order_number=gen_order_number(),
        user_id=current.id,
        items=items,
        shipping_address=body.shipping_address.model_dump(),
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        tax=tax,
        total=total,
        payment_method=body.payment_method,
        payment_status="paid",
        notes=body.notes,
    )
    db.add(order)
    await db.flush()
    return OrderOut.model_validate(order)


@router.patch("/{id}/status", response_model=OrderOut)
async def update_order_status(id: str, body: OrderStatusUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {sorted(VALID_STATUSES)}")
    order = (await db.execute(select(Order).where(Order.id == id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = body.status
    return OrderOut.model_validate(order)

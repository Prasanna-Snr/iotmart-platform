import asyncio
import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import Order, Product, User
from app.schemas.orders import OrderCreate, OrderStatusUpdate, OrderOut
from app.security import get_current_user, get_current_admin
from app.email_service import (
    send_new_order_email,
    send_order_confirmation_email,
    send_order_status_email,
)
from app.config import settings
from app.routers.rewards import points_for_total

router = APIRouter()

VALID_STATUSES = {"pending", "processing", "shipped", "delivered", "cancelled", "refunded"}
NOTIFY_STATUSES = {"processing", "delivered", "cancelled"}

# Keeps fire-and-forget email tasks alive until they finish.
_background_tasks: set[asyncio.Task] = set()


def gen_order_number() -> str:
    return "ORD-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def _spawn(coro) -> None:
    """Schedule an async job without blocking the request. Never awaits."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def _get_setting(db: AsyncSession, key: str, default: str) -> str:
    from app.models.models import SiteSettings

    row = (await db.execute(select(SiteSettings).where(SiteSettings.key == key))).scalar_one_or_none()
    return row.value if row else default


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
    # ── 1. Server-side calculation ────────────────────────────────────────
    # Prices are read from the database, never trusted from the client.
    # Products are row-locked (SELECT ... FOR UPDATE) so concurrent orders
    # cannot oversell the same stock.
    requested = [(item.product_id, item.quantity) for item in body.items]
    if not requested:
        raise HTTPException(status_code=400, detail="Order has no items")

    product_ids = [pid for pid, _ in requested]
    rows = (await db.execute(
        select(Product).where(Product.id.in_(product_ids)).with_for_update()
    )).scalars().all()
    products = {str(p.id): p for p in rows}

    item_snapshots = []
    for pid, qty in requested:
        product = products.get(pid)
        if not product:
            raise HTTPException(status_code=400, detail=f"Product not found: {pid}")
        if qty < 1:
            raise HTTPException(status_code=400, detail=f"Invalid quantity for {product.name}")
        if product.stock < qty:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient stock for {product.name}. "
                       f"{product.stock} available, {qty} requested.",
            )
        item_snapshots.append((product, qty))

    # ── 2. Atomic order creation + stock reservation ──────────────────────
    # Stock is decremented here (reserved at order time for COD). Everything
    # — order row + stock updates — is one database transaction, so a failure
    # anywhere rolls the whole thing back.
    subtotal = round(sum(product.price * qty for product, qty in item_snapshots), 2)
    free_threshold = float(await _get_setting(db, "shipping_free_threshold", "5000"))
    default_cost = float(await _get_setting(db, "shipping_default_cost", "100"))
    shipping_cost = 0.0 if subtotal >= free_threshold else default_cost
    total = round(subtotal + shipping_cost, 2)

    items_json = [
        {
            "product_id": str(product.id),
            "product_name": product.name,
            "product_image": (product.images or [""])[0] if isinstance(product.images, list) and product.images else "",
            "price": product.price,
            "quantity": qty,
            "subtotal": round(product.price * qty, 2),
        }
        for product, qty in item_snapshots
    ]

    for product, qty in item_snapshots:
        product.stock -= qty
        if product.stock <= 0:
            product.stock = 0
            product.in_stock = False

    order = Order(
        order_number=gen_order_number(),
        user_id=current.id,
        customer_email=current.email,
        items=items_json,
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

    # ── 3. Notifications (fire-and-forget, never block the response) ─────
    store_email = await _get_setting(db, "store_email", settings.smtp_from_email)
    if store_email:
        _spawn(send_new_order_email(
            to_email=store_email,
            order_number=order.order_number,
            customer_name=current.name,
            customer_email=current.email,
            items=items_json,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            total=total,
            shipping_address=body.shipping_address.model_dump(),
        ))
    _spawn(send_order_confirmation_email(
        to_email=current.email,
        order_number=order.order_number,
        customer_name=current.name,
        items=items_json,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        total=total,
        shipping_address=body.shipping_address.model_dump(),
    ))

    return OrderOut.model_validate(order)


async def _restock_order(db: AsyncSession, order: Order) -> None:
    """Return reserved stock to products when an order is cancelled."""
    for item in order.items or []:
        product = (await db.execute(
            select(Product).where(Product.id == item.get("product_id"))
        )).scalar_one_or_none()
        if not product:
            continue
        product.stock = (product.stock or 0) + int(item.get("quantity") or 0)
        if product.stock > 0:
            product.in_stock = True


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
    await _restock_order(db, order)

    if order.customer_email:
        _spawn(send_order_status_email(order.customer_email, order.order_number, "cancelled"))
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
        if order.user_id and order.total > 0:
            from app.models.models import RewardTransaction

            existing = (await db.execute(
                select(RewardTransaction).where(RewardTransaction.order_id == order.id)
            )).scalar_one_or_none()
            if not existing:
                points = points_for_total(order.total)
                if points > 0:
                    db.add(RewardTransaction(
                        user_id=order.user_id,
                        points=points,
                        order_id=order.id,
                        description=f"Reward points for order {order.order_number}",
                    ))
    elif body.status == "cancelled":
        await _restock_order(db, order)

    if order.customer_email and body.status in NOTIFY_STATUSES:
        _spawn(send_order_status_email(order.customer_email, order.order_number, body.status))

    return OrderOut.model_validate(order)

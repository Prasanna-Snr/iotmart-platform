from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.models import Order, Product, User, AdminAuditLog
from app.schemas.admin import AdminDashboard, DashboardStats, DashboardMonthly, DashboardTopProduct
from app.schemas.orders import OrderOut
from app.security import get_current_admin

router = APIRouter()

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _month_bounds(dt: datetime) -> tuple[datetime, datetime]:
    """Return (start_of_month, start_of_next_month) in UTC for a given datetime."""
    start = datetime(dt.year, dt.month, 1, tzinfo=timezone.utc)
    if dt.month == 12:
        end = datetime(dt.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(dt.year, dt.month + 1, 1, tzinfo=timezone.utc)
    return start, end


def _change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round((current - previous) / previous * 100, 1)


@router.get("/dashboard", response_model=AdminDashboard)
async def admin_dashboard(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    now = datetime.now(timezone.utc)

    # ── All orders (created order, newest first) ────────────────────────────
    result = await db.execute(select(Order).order_by(Order.created_at.desc()))
    orders = result.scalars().all()

    # ── Revenue ─────────────────────────────────────────────────────────────
    revenue_orders = [o for o in orders if o.status != "cancelled"]
    total_revenue = round(sum(o.total for o in revenue_orders), 2)

    this_start, this_end = _month_bounds(now)
    if now.month == 1:
        prev_start = datetime(now.year - 1, 12, 1, tzinfo=timezone.utc)
    else:
        prev_start = datetime(now.year, now.month - 1, 1, tzinfo=timezone.utc)

    this_rev = round(sum(o.total for o in revenue_orders
                         if this_start <= o.created_at.replace(tzinfo=timezone.utc) < this_end), 2)
    prev_rev = round(sum(o.total for o in revenue_orders
                         if prev_start <= o.created_at.replace(tzinfo=timezone.utc) < this_start), 2)

    # ── Order counts ────────────────────────────────────────────────────────
    this_orders = sum(1 for o in orders if this_start <= o.created_at.replace(tzinfo=timezone.utc) < this_end)
    prev_orders = sum(1 for o in orders if prev_start <= o.created_at.replace(tzinfo=timezone.utc) < this_start)

    # ── Customers & products ────────────────────────────────────────────────
    users = (await db.execute(select(User).where(User.role == "customer"))).scalars().all()
    products_count = (await db.execute(select(func.count(Product.id)))).scalar_one() or 0

    this_customers = sum(1 for u in users
                         if this_start <= u.created_at.replace(tzinfo=timezone.utc) < this_end)
    prev_customers = sum(1 for u in users
                         if prev_start <= u.created_at.replace(tzinfo=timezone.utc) < this_start)

    # ── Monthly revenue (last 6 months) ─────────────────────────────────────
    monthly = []
    for i in range(5, -1, -1):
        if now.month - i <= 0:
            y = now.year - 1
            m = 12 + (now.month - i)
        else:
            y = now.year
            m = now.month - i
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) if m == 12 else datetime(y, m + 1, 1, tzinfo=timezone.utc)
        val = round(sum(o.total for o in revenue_orders
                        if start <= o.created_at.replace(tzinfo=timezone.utc) < end), 2)
        monthly.append(DashboardMonthly(label=MONTHS[m - 1], value=val))

    # ── Top products by quantity sold ───────────────────────────────────────
    sold: dict[str, dict] = {}
    for o in orders:
        if o.status == "cancelled":
            continue
        for item in o.items or []:
            name = item.get("product_name") or "Unknown"
            qty = item.get("quantity") or 0
            price = item.get("price") or 0
            entry = sold.setdefault(name, {"sold": 0, "revenue": 0.0})
            entry["sold"] += qty
            entry["revenue"] += qty * price
    top_products = [
        DashboardTopProduct(name=k, sold=v["sold"], revenue=round(v["revenue"], 2))
        for k, v in sorted(sold.items(), key=lambda kv: kv[1]["sold"], reverse=True)[:5]
    ]

    recent_orders = [OrderOut.model_validate(o).model_dump(mode="json") for o in orders[:5]]

    stats = DashboardStats(
        total_revenue=total_revenue,
        total_orders=len(orders),
        total_customers=len(users),
        total_products=products_count,
        revenue_change=_change(this_rev, prev_rev),
        orders_change=_change(float(this_orders), float(prev_orders)),
        customers_change=_change(float(this_customers), float(prev_customers)),
    )

    return AdminDashboard(
        stats=stats,
        monthly_revenue=monthly,
        top_products=top_products,
        recent_orders=recent_orders,
    )


@router.get("/audit", response_model=list[dict])
async def audit_log(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    _=Depends(get_current_admin),
):
    """Latest admin/security audit trail entries (newest first)."""
    rows = (await db.execute(
        select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(limit)
    )).scalars().all()
    return [{
        "id": str(r.id),
        "actor_id": str(r.actor_id) if r.actor_id else None,
        "actor_email": r.actor_email,
        "action": r.action,
        "target_type": r.target_type,
        "target_id": r.target_id,
        "detail": r.detail,
        "created_at": r.created_at,
    } for r in rows]

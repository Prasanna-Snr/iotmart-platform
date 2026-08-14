from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.models import User
from app.schemas.auth import UserOut
from app.security import get_current_admin

router = APIRouter()


@router.get("")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
    page: int | None = Query(None, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    search: str | None = Query(None),
):
    """List users. Without `page`, returns the full array (backward compatible).

    With `page`, returns a paginated customer list:
    {"items": [...], "total": n, "page": p, "page_size": s}.
    """
    if page is None:
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        return [UserOut.model_validate(u) for u in result.scalars().all()]

    conditions = [User.role == "customer"]
    if search:
        conditions.append(or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
    base_q = select(User).where(*conditions)
    total = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar_one()
    q = base_q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = [UserOut.model_validate(u) for u in (await db.execute(q)).scalars().all()]
    return {"items": items, "total": total, "page": page, "page_size": page_size}

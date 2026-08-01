from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import User
from app.schemas.auth import UserOut, UserUpdate
from app.security import get_current_user, get_current_admin

router = APIRouter()


@router.get("", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [UserOut.model_validate(u) for u in result.scalars().all()]


@router.get("/{id}", response_model=UserOut)
async def get_user(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)


@router.patch("/{id}", response_model=UserOut)
async def update_user(id: str, body: UserUpdate, db: AsyncSession = Depends(get_db), current=Depends(get_current_user)):
    if str(current.id) != id and current.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    return UserOut.model_validate(user)


@router.delete("/{id}", status_code=204)
async def delete_user(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)

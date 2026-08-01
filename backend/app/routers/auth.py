from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import User
from app.schemas.auth import UserCreate, UserLogin, UserOut, TokenOut, UserUpdate
from app.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user,
)
from app.config import settings

router = APIRouter()

REFRESH_COOKIE = "refresh_token"


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(body: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=body.name, email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    await db.flush()
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    response.set_cookie(REFRESH_COOKIE, refresh, httponly=True, samesite="lax",
                        max_age=settings.refresh_token_expire_days * 86400, secure=False)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(body: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    response.set_cookie(REFRESH_COOKIE, refresh, httponly=True, samesite="lax",
                        max_age=settings.refresh_token_expire_days * 86400, secure=False)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenOut)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    response.set_cookie(REFRESH_COOKIE, new_refresh, httponly=True, samesite="lax",
                        max_age=settings.refresh_token_expire_days * 86400, secure=False)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(REFRESH_COOKIE)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_me(body: UserUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    return UserOut.model_validate(user)

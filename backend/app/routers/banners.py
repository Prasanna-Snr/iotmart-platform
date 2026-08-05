from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import Banner
from app.schemas.banners import BannerCreate, BannerUpdate, BannerOut
from app.security import get_current_admin

router = APIRouter()


@router.get("", response_model=list[BannerOut])
async def list_banners(active: bool | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Banner).order_by(Banner.order, Banner.created_at)
    if active is not None:
        query = query.where(Banner.active == active)
    result = await db.execute(query)
    return [BannerOut.model_validate(b) for b in result.scalars().all()]


@router.post("", response_model=BannerOut, status_code=201)
async def create_banner(body: BannerCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    banner = Banner(**body.model_dump())
    db.add(banner)
    await db.flush()
    return BannerOut.model_validate(banner)


@router.put("/{id}", response_model=BannerOut)
async def update_banner(id: str, body: BannerUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Banner).where(Banner.id == id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(banner, field, value)
    return BannerOut.model_validate(banner)


@router.delete("/{id}", status_code=204)
async def delete_banner(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Banner).where(Banner.id == id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    await db.delete(banner)

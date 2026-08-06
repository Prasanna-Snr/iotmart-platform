from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import Brand
from app.schemas.catalog import BrandCreate, BrandUpdate, BrandOut
from app.security import get_current_admin
from app.audit import record as audit

router = APIRouter()


@router.get("", response_model=list[BrandOut])
async def list_brands(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Brand).order_by(Brand.name))
    return [BrandOut.model_validate(b) for b in result.scalars().all()]


@router.get("/{slug}", response_model=BrandOut)
async def get_brand(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Brand).where(Brand.slug == slug))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return BrandOut.model_validate(brand)


@router.post("", response_model=BrandOut, status_code=201)
async def create_brand(body: BrandCreate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    existing = await db.execute(select(Brand).where(Brand.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    brand = Brand(**body.model_dump())
    db.add(brand)
    await db.flush()
    await audit(db, admin, "brand.create", "brand", brand.id, brand.slug)
    return BrandOut.model_validate(brand)


@router.put("/{id}", response_model=BrandOut)
async def update_brand(id: str, body: BrandUpdate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    result = await db.execute(select(Brand).where(Brand.id == id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(brand, field, value)
    await audit(db, admin, "brand.update", "brand", brand.id, brand.slug)
    return BrandOut.model_validate(brand)


@router.delete("/{id}", status_code=204)
async def delete_brand(id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    result = await db.execute(select(Brand).where(Brand.id == id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    await audit(db, admin, "brand.delete", "brand", brand.id, brand.slug)
    try:
        await db.delete(brand)
        await db.flush()
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Brand is assigned to products and cannot be deleted.",
        )

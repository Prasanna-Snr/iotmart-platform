from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.models import Category, Product
from app.schemas.catalog import CategoryCreate, CategoryUpdate, CategoryOut
from app.security import get_current_admin
from app.audit import record as audit

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    # Attach product counts
    counts_result = await db.execute(
        select(Product.category_id, func.count(Product.id)).group_by(Product.category_id)
    )
    counts = {str(row[0]): row[1] for row in counts_result}
    out = []
    for c in categories:
        d = CategoryOut.model_validate(c)
        d.product_count = counts.get(str(c.id), 0)
        out.append(d)
    return out


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(body: CategoryCreate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    existing = await db.execute(select(Category).where(Category.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    category = Category(**body.model_dump())
    db.add(category)
    await db.flush()
    await audit(db, admin, "category.create", "category", category.id, category.slug)
    return CategoryOut.model_validate(category)


@router.put("/{id}", response_model=CategoryOut)
async def update_category(id: str, body: CategoryUpdate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    result = await db.execute(select(Category).where(Category.id == id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(category, field, value)
    await audit(db, admin, "category.update", "category", category.id, category.slug)
    return CategoryOut.model_validate(category)


@router.delete("/{id}", status_code=204)
async def delete_category(id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    result = await db.execute(select(Category).where(Category.id == id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await audit(db, admin, "category.delete", "category", category.id, category.slug)
    try:
        await db.delete(category)
        await db.flush()
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Category is assigned to products and cannot be deleted.",
        )

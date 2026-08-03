from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import Tutorial, TutorialCategory
from app.schemas.tutorials import (
    TutorialCreate, TutorialUpdate, TutorialOut, TutorialListOut,
    TutorialCategoryCreate, TutorialCategoryOut,
)
from app.security import get_current_admin

router = APIRouter()


@router.get("/categories", response_model=list[TutorialCategoryOut])
async def list_tutorial_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TutorialCategory).order_by(TutorialCategory.name))
    return [TutorialCategoryOut.model_validate(c) for c in result.scalars().all()]


@router.post("/categories", response_model=TutorialCategoryOut, status_code=201)
async def create_tutorial_category(body: TutorialCategoryCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    existing = (await db.execute(select(TutorialCategory).where(TutorialCategory.slug == body.slug))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    cat = TutorialCategory(**body.model_dump())
    db.add(cat)
    await db.flush()
    return TutorialCategoryOut.model_validate(cat)


@router.put("/categories/{id}", response_model=TutorialCategoryOut)
async def update_tutorial_category(id: str, body: TutorialCategoryCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    cat = (await db.execute(select(TutorialCategory).where(TutorialCategory.id == id))).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in body.model_dump().items():
        setattr(cat, field, value)
    return TutorialCategoryOut.model_validate(cat)


@router.delete("/categories/{id}", status_code=204)
async def delete_tutorial_category(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    cat = (await db.execute(select(TutorialCategory).where(TutorialCategory.id == id))).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(cat)


@router.get("", response_model=TutorialListOut)
async def list_tutorials(
    db: AsyncSession = Depends(get_db),
    category: str | None = Query(None),
    difficulty: str | None = Query(None),
    featured: bool | None = Query(None),
    published: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    conditions = []
    if published is not None:
        conditions.append(Tutorial.published == published)
    if category:
        cat = (await db.execute(select(TutorialCategory).where(TutorialCategory.slug == category))).scalar_one_or_none()
        if cat:
            conditions.append(Tutorial.category_id == cat.id)
    if difficulty:
        conditions.append(Tutorial.difficulty == difficulty)
    if featured is not None:
        conditions.append(Tutorial.featured == featured)
    if search:
        conditions.append(or_(Tutorial.title.ilike(f"%{search}%"), Tutorial.description.ilike(f"%{search}%")))

    base_q = select(Tutorial).where(*conditions)
    total = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar_one()
    q = (base_q.options(selectinload(Tutorial.category))
         .order_by(Tutorial.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
    tutorials = (await db.execute(q)).scalars().all()
    return TutorialListOut(items=[TutorialOut.model_validate(t) for t in tutorials], total=total, page=page, page_size=page_size)


@router.get("/{slug}", response_model=TutorialOut)
async def get_tutorial(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tutorial).options(selectinload(Tutorial.category)).where(Tutorial.slug == slug))
    tutorial = result.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    tutorial.views = (tutorial.views or 0) + 1
    return TutorialOut.model_validate(tutorial)


@router.post("", response_model=TutorialOut, status_code=201)
async def create_tutorial(body: TutorialCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if (await db.execute(select(Tutorial).where(Tutorial.slug == body.slug))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    tutorial = Tutorial(**body.model_dump())
    db.add(tutorial)
    await db.flush()
    await db.refresh(tutorial, ["category"])
    return TutorialOut.model_validate(tutorial)


@router.put("/{id}", response_model=TutorialOut)
async def update_tutorial(id: str, body: TutorialUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    tutorial = (await db.execute(select(Tutorial).where(Tutorial.id == id))).scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tutorial, field, value)
    await db.flush()
    # Re-fetch with relationship eagerly loaded so Pydantic doesn't trigger
    # a lazy-load outside an async context.
    result = await db.execute(
        select(Tutorial)
        .options(selectinload(Tutorial.category))
        .where(Tutorial.id == tutorial.id)
    )
    tutorial = result.scalar_one()
    return TutorialOut.model_validate(tutorial)


@router.delete("/{id}", status_code=204)
async def delete_tutorial(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    tutorial = (await db.execute(select(Tutorial).where(Tutorial.id == id))).scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    await db.delete(tutorial)

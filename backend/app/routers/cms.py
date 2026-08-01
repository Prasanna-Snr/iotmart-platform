from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import CMSPage
from app.schemas.cms import CMSPageCreate, CMSPageUpdate, CMSPageOut, CMSPageListItem
from app.security import get_current_admin

router = APIRouter()


@router.get("/pages", response_model=list[CMSPageListItem])
async def list_pages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CMSPage).order_by(CMSPage.updated_at.desc()))
    pages = result.scalars().all()
    out = []
    for p in pages:
        item = CMSPageListItem.model_validate(p)
        item.block_count = len(p.blocks) if p.blocks else 0
        out.append(item)
    return out


@router.get("/pages/slug/{slug}", response_model=CMSPageOut)
async def get_page_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CMSPage).where(CMSPage.slug == slug))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return CMSPageOut.model_validate(page)


@router.get("/pages/{id}", response_model=CMSPageOut)
async def get_page(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CMSPage).where(CMSPage.id == id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return CMSPageOut.model_validate(page)


@router.post("/pages", response_model=CMSPageOut, status_code=201)
async def create_page(body: CMSPageCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if (await db.execute(select(CMSPage).where(CMSPage.slug == body.slug))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    page = CMSPage(**body.model_dump())
    db.add(page)
    await db.flush()
    return CMSPageOut.model_validate(page)


@router.put("/pages/{id}", response_model=CMSPageOut)
async def save_page(id: str, body: CMSPageUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    page = (await db.execute(select(CMSPage).where(CMSPage.id == id))).scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(page, field, value)
    return CMSPageOut.model_validate(page)


@router.delete("/pages/{id}", status_code=204)
async def delete_page(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    page = (await db.execute(select(CMSPage).where(CMSPage.id == id))).scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await db.delete(page)

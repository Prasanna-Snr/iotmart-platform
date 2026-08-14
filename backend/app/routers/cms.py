from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import CMSPage
from app.schemas.cms import CMSPageListItem
from app.security import get_current_admin
from app.audit import record as audit

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


@router.delete("/pages/{id}", status_code=204)
async def delete_page(id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    page = (await db.execute(select(CMSPage).where(CMSPage.id == id))).scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await audit(db, admin, "cms.delete", "cms_page", page.id, page.slug)
    await db.delete(page)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import NewsletterSubscriber
from app.schemas.newsletter import NewsletterSubscribeIn, NewsletterSubscriberOut
from app.security import get_current_admin

router = APIRouter()


@router.post("/subscribe", response_model=NewsletterSubscriberOut, status_code=201)
async def subscribe(body: NewsletterSubscribeIn, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == body.email)
    )).scalar_one_or_none()
    if row:
        row.subscribed = True
        return NewsletterSubscriberOut.model_validate(row)
    row = NewsletterSubscriber(email=body.email, subscribed=True)
    db.add(row)
    await db.flush()
    return NewsletterSubscriberOut.model_validate(row)


@router.delete("/{email}", response_model=NewsletterSubscriberOut)
async def unsubscribe(email: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Email not subscribed")
    row.subscribed = False
    return NewsletterSubscriberOut.model_validate(row)


@router.get("", response_model=list[NewsletterSubscriberOut])
async def list_subscribers(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(
        select(NewsletterSubscriber).order_by(NewsletterSubscriber.created_at.desc())
    )
    return [NewsletterSubscriberOut.model_validate(s) for s in result.scalars().all()]

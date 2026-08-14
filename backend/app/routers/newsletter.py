from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import NewsletterSubscriber
from app.schemas.newsletter import NewsletterSubscribeIn, NewsletterSubscriberOut

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

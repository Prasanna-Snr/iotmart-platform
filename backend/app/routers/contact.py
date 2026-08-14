import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime, timezone
from app.database import get_db
from app.models.models import ContactMessage, SiteSettings
from app.email_service import send_contact_email
from app.config import settings
from app.limiter import limiter

router = APIRouter()


class ContactIn(BaseModel):
    name:    str
    email:   EmailStr
    subject: str
    message: str
    website: str = ""  # honeypot — humans never see/fill this field


class ContactOut(BaseModel):
    id:         UUID
    name:       str
    email:      str
    subject:    str
    message:    str
    read:       bool
    created_at: datetime
    model_config = {"from_attributes": True}


@router.post("", response_model=ContactOut, status_code=201)
@limiter.limit("10/hour")
async def submit_contact(body: ContactIn, request: Request, db: AsyncSession = Depends(get_db)):
    """Public endpoint — no auth required."""
    # Honeypot trap: a filled `website` field means an automated bot. Respond
    # with a normal success shape but store nothing / send no email.
    if body.website:
        return ContactOut(
            id=uuid.uuid4(),
            name=body.name.strip(),
            email=body.email,
            subject=body.subject.strip(),
            message=body.message.strip(),
            read=False,
            created_at=datetime.now(timezone.utc),
        )
    if len(body.message.strip()) < 10:
        raise HTTPException(status_code=422, detail="Message is too short.")
    msg = ContactMessage(
        name=body.name.strip(),
        email=body.email,
        subject=body.subject.strip(),
        message=body.message.strip(),
    )
    db.add(msg)
    await db.flush()

    # Fire-and-forget notification to store admin email
    row = (await db.execute(select(SiteSettings).where(SiteSettings.key == "store_email"))).scalar_one_or_none()
    store_email = (row.value if row and row.value else None) or settings.smtp_from_email
    if store_email:
        asyncio.create_task(send_contact_email(
            to_email     = store_email,
            sender_name  = body.name.strip(),
            sender_email = body.email,
            subject      = body.subject.strip(),
            message      = body.message.strip(),
        ))

    return ContactOut.model_validate(msg)

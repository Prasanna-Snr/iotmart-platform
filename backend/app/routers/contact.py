import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.models import ContactMessage, SiteSettings
from app.security import get_current_admin
from app.email_service import send_contact_email
from app.config import settings

router = APIRouter()


class ContactIn(BaseModel):
    name:    str
    email:   EmailStr
    subject: str
    message: str


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
async def submit_contact(body: ContactIn, db: AsyncSession = Depends(get_db)):
    """Public endpoint — no auth required."""
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


@router.get("", response_model=list[ContactOut])
async def list_messages(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Admin only — list all contact messages."""
    result = await db.execute(
        select(ContactMessage).order_by(ContactMessage.created_at.desc())
    )
    return [ContactOut.model_validate(m) for m in result.scalars().all()]


@router.patch("/{id}/read", response_model=ContactOut)
async def mark_read(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Admin only — toggle read status."""
    msg = (await db.execute(
        select(ContactMessage).where(ContactMessage.id == id)
    )).scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.read = not msg.read
    await db.flush()
    return ContactOut.model_validate(msg)


@router.delete("/{id}", status_code=204)
async def delete_message(id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Admin only — delete a message."""
    msg = (await db.execute(
        select(ContactMessage).where(ContactMessage.id == id)
    )).scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    await db.delete(msg)

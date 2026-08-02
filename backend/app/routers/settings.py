from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.models import SiteSettings
from app.security import get_current_admin

router = APIRouter()

# Default values used when a key hasn't been saved yet
DEFAULTS: dict[str, str] = {
    # Store
    "store_name":        "IoTMart",
    "store_description": "Your one-stop shop for IoT gadgets, sensors, and development boards",
    "store_url":         "http://localhost:3000",
    "store_email":       "support@iotmart.com",
    "store_phone":       "+1 (800) 468-6278",
    "store_address":     "123 Silicon Valley, San Francisco, CA 94102",
    "store_hours":       "Mon–Fri: 9AM–5PM | Weekends: Email only",
    "store_currency":    "USD",
    # Shipping
    "shipping_free_threshold":  "50",
    "shipping_default_cost":    "5.99",
    "shipping_processing_days": "1-2",
    # Tax
    "tax_rate": "8",
    "tax_id":   "",
    # Notifications (stored as "true"/"false")
    "notify_new_order":  "true",
    "notify_low_stock":  "true",
    "notify_new_review": "false",
    "notify_newsletter": "true",
}


class SettingsOut(BaseModel):
    settings: dict[str, str]


class SettingsIn(BaseModel):
    settings: dict[str, str]


async def _merged(db: AsyncSession) -> dict[str, str]:
    rows = (await db.execute(select(SiteSettings))).scalars().all()
    return {**DEFAULTS, **{r.key: r.value for r in rows}}


@router.get("", response_model=SettingsOut)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Public — returns merged settings (defaults + saved). No auth needed."""
    return SettingsOut(settings=await _merged(db))


@router.put("", response_model=SettingsOut)
async def save_settings(body: SettingsIn, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    for key, value in body.settings.items():
        existing = (await db.execute(
            select(SiteSettings).where(SiteSettings.key == key)
        )).scalar_one_or_none()
        if existing:
            existing.value = value
        else:
            db.add(SiteSettings(key=key, value=value))
    await db.flush()
    return SettingsOut(settings=await _merged(db))

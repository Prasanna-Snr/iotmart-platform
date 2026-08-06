"""Core Web Vitals endpoint.

The frontend ``WebVitals`` beacon (src/components/WebVitals.tsx) POSTs real
user metric samples here via ``/api/vitals`` on the Next proxy. The endpoint
is public (beacon runs in the browser), rate-limited per IP, and stores
samples for admin review.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.models.models import VitalMetric
from app.security import get_current_admin

router = APIRouter()


class VitalSample(BaseModel):
    name: str = Field(..., max_length=50)
    value: float
    rating: str | None = Field(None, max_length=20)
    label: str | None = Field(None, max_length=50)
    path: str | None = Field(None, max_length=2048)


class VitalOut(BaseModel):
    id: UUID
    name: str
    value: float
    rating: str | None = None
    label: str | None = None
    path: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


@router.post("", status_code=204)
@limiter.limit("120/minute")
async def record_vital(
    body: VitalSample,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    db.add(VitalMetric(**body.model_dump()))
    return Response(status_code=204)


@router.get("", response_model=list[VitalOut])
async def list_vitals(
    db: AsyncSession = Depends(get_db),
    name: str | None = Query(None, max_length=50),
    limit: int = Query(100, ge=1, le=500),
    _=Depends(get_current_admin),
):
    q = select(VitalMetric).order_by(VitalMetric.created_at.desc()).limit(limit)
    if name:
        q = q.where(VitalMetric.name == name)
    rows = (await db.execute(q)).scalars().all()
    return [VitalOut.model_validate(r) for r in rows]

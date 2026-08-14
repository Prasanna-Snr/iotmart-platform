"""Core Web Vitals endpoint.

The frontend ``WebVitals`` beacon (src/components/WebVitals.tsx) POSTs real
user metric samples here via ``/api/vitals`` on the Next proxy. The endpoint
is public (beacon runs in the browser), rate-limited per IP, and stores
samples for later review.
"""

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.models.models import VitalMetric

router = APIRouter()


class VitalSample(BaseModel):
    name: str = Field(..., max_length=50)
    value: float
    rating: str | None = Field(None, max_length=20)
    label: str | None = Field(None, max_length=50)
    path: str | None = Field(None, max_length=2048)


@router.post("", status_code=204)
@limiter.limit("120/minute")
async def record_vital(
    body: VitalSample,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    db.add(VitalMetric(**body.model_dump()))
    return Response(status_code=204)

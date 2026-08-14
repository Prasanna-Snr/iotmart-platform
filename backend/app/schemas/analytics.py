from pydantic import BaseModel
from typing import Any


class TrackRequest(BaseModel):
    path: str
    referrer: str | None = None
    session_id: str | None = None
    duration_ms: int | None = None  # for heartbeat/unload updates


class HeartbeatRequest(BaseModel):
    session_id: str
    path: str
    duration_ms: int | None = None


class AnalyticsSummary(BaseModel):
    visitors_today: int
    visitors_this_week: int
    visitors_this_month: int
    total_visitors: int
    page_views_today: int
    page_views_total: int
    online_now: int


class TopPage(BaseModel):
    path: str
    views: int
    unique_visitors: int


class DeviceBreakdown(BaseModel):
    device_type: str
    count: int


class BrowserBreakdown(BaseModel):
    browser: str
    count: int


class CountryBreakdown(BaseModel):
    country: str
    count: int


class DailyTrend(BaseModel):
    day: str
    unique_visitors: int
    page_views: int

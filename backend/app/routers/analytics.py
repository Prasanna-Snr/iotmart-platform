import asyncio

from fastapi import APIRouter, Depends, Request, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.security import get_current_admin
from app.schemas.analytics import (
    TrackRequest, HeartbeatRequest,
    AnalyticsDashboard, AnalyticsSummary,
    TopPage, DeviceBreakdown, BrowserBreakdown, CountryBreakdown, DailyTrend,
)
from app.services.analytics_service import (
    should_skip, hash_ip, make_visitor_id,
    record_page_view, upsert_online_visitor, prune_online_visitors,
    update_duration, get_summary, get_top_pages,
    get_device_breakdown, get_browser_breakdown,
    get_country_breakdown, get_daily_trend,
)

router = APIRouter()


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


@router.post("/track", status_code=204)
async def track_page_view(
    body: TrackRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Called by the frontend beacon on every public page load."""
    ua = request.headers.get("user-agent")
    ip = _get_client_ip(request)

    if should_skip(body.path, ua):
        return Response(status_code=204)

    # If duration_ms provided, it's a session-end update (unload event)
    if body.duration_ms is not None and body.session_id:
        await update_duration(db, body.session_id, body.path, body.duration_ms)
        return Response(status_code=204)

    ip_hash = hash_ip(ip)
    visitor_id = make_visitor_id(ip_hash, ua)

    sid = await record_page_view(
        db,
        path=body.path,
        ip=ip,
        user_agent=ua,
        referrer=body.referrer,
        session_id=body.session_id,
    )

    # upsert online presence + prune stale visitors in background
    background_tasks.add_task(
        _bg_upsert_and_prune, body.path, sid, visitor_id
    )

    return Response(status_code=204, headers={"X-Session-Id": sid})


async def _bg_upsert_and_prune(path: str, session_id: str, visitor_id: str):
    """Background task — separate DB session to avoid blocking the response."""
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            await upsert_online_visitor(db, session_id=session_id, visitor_id=visitor_id, path=path)
            await prune_online_visitors(db)
            await db.commit()
        except Exception:
            await db.rollback()


@router.post("/heartbeat", status_code=204)
async def heartbeat(
    body: HeartbeatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Keep the online-visitor record alive and optionally update duration."""
    if body.duration_ms is not None:
        await update_duration(db, body.session_id, body.path, body.duration_ms)

    ip_hash = "heartbeat"  # visitor_id reuse from session is fine
    background_tasks.add_task(
        _bg_upsert_and_prune, body.path, body.session_id, body.session_id
    )
    return Response(status_code=204)


# ─── Admin read endpoints (protected) ──────────────────────────────────

@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await get_summary(db)


@router.get("/dashboard", response_model=AnalyticsDashboard)
async def analytics_dashboard(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    summary, top_pages, devices, browsers, countries, trend = await asyncio.gather(
        get_summary(db),
        get_top_pages(db),
        get_device_breakdown(db),
        get_browser_breakdown(db),
        get_country_breakdown(db),
        get_daily_trend(db),
    )
    return AnalyticsDashboard(
        summary=summary,
        top_pages=top_pages,
        devices=devices,
        browsers=browsers,
        countries=countries,
        daily_trend=trend,
    )


@router.get("/top-pages", response_model=list[TopPage])
async def top_pages(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await get_top_pages(db, limit=limit)


@router.get("/devices", response_model=list[DeviceBreakdown])
async def device_breakdown(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await get_device_breakdown(db)


@router.get("/browsers", response_model=list[BrowserBreakdown])
async def browser_breakdown(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await get_browser_breakdown(db)


@router.get("/countries", response_model=list[CountryBreakdown])
async def country_breakdown(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await get_country_breakdown(db)


@router.get("/trend", response_model=list[DailyTrend])
async def daily_trend(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await get_daily_trend(db, days=days)

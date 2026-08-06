import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request, Response, BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.security import get_current_admin
from app.limiter import limiter
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
    run_daily_rollup, prune_old_views, get_daily_rollup,
)

router = APIRouter()


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


async def _get_setting(db: AsyncSession, key: str, default: str) -> str:
    from app.models.models import SiteSettings

    row = (await db.execute(select(SiteSettings).where(SiteSettings.key == key))).scalar_one_or_none()
    return row.value if row else default


async def _maybe_rollup_yesterday(db: AsyncSession) -> None:
    """Best-effort lazy rollup for yesterday — never fails the request."""
    try:
        from app.models.models import DailyAnalytics

        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date()
        exists = (
            await db.execute(
                select(func.count()).select_from(DailyAnalytics).where(DailyAnalytics.day == yesterday)
            )
        ).scalar_one() or 0
        if not exists:
            await run_daily_rollup(db, day=yesterday)
            await db.flush()
    except Exception:
        pass


@router.post("/track", status_code=204)
@limiter.limit("120/minute")
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
@limiter.limit("60/minute")
async def heartbeat(
    body: HeartbeatRequest,
    request: Request,
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
    await _maybe_rollup_yesterday(db)
    return await get_daily_trend(db, days=days)


@router.get("/admin/rollup")
async def admin_rollup_rows(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Pre-aggregated daily rows for the admin UI (newest first)."""
    rows = await get_daily_rollup(db, days=days)
    return [
        {
            "day": str(r.day),
            "views": r.views,
            "visitors": r.visitors,
            "sessions": r.sessions,
            "avg_duration_ms": r.avg_duration_ms,
            "top_paths": r.top_paths or [],
            "devices": r.devices or [],
            "browsers": r.browsers or [],
            "countries": r.countries or [],
        }
        for r in rows
    ]


@router.post("/admin/rollup")
@limiter.limit("20/hour")
async def admin_rollup_run(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Roll up the trailing 7 days and prune views older than the retention window."""
    raw = await _get_setting(db, "analytics_retention_days", "90")
    retention_days = int(raw) if raw else 90

    today = datetime.now(timezone.utc).date()
    days_done = 0
    for offset in range(1, 8):
        await run_daily_rollup(db, day=today - timedelta(days=offset))
        days_done += 1

    pruned = await prune_old_views(db, retention_days)
    return {"days": days_done, "pruned": pruned}

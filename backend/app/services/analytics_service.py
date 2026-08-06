"""
Analytics service — all database operations for visitor tracking.
Uses async SQLAlchemy, never stores raw IPs.
"""
from __future__ import annotations

import hashlib
import secrets
import re
from datetime import date, datetime, time, timezone, timedelta
from typing import Any

from sqlalchemy import select, func, distinct, and_, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import PageView, OnlineVisitor, DailyAnalytics


# ─── Bot detection ─────────────────────────────────────────────────

BOT_PATTERN = re.compile(
    r"(bot|crawl|spider|slurp|baidu|yandex|bingbot|googlebot|facebot"
    r"|ia_archiver|python-requests|curl|wget|libwww|jakarta|java/"
    r"|go-http|okhttp|axios|postman|insomnia|scrapy|nutch|archive"
    r"|checker|monitor|pingdom|uptimerobot|statuspage|newrelic"
    r"|datadog|dynatrace|lighthouse|headlesschrome|phantomjs|selenium)",
    re.IGNORECASE,
)

SKIP_PATHS = re.compile(
    r"^/(api|admin|_next|__nextjs|favicon|robots|sitemap|uploads|health)",
    re.IGNORECASE,
)


def should_skip(path: str, user_agent: str | None) -> bool:
    if SKIP_PATHS.match(path):
        return True
    if user_agent and BOT_PATTERN.search(user_agent):
        return True
    return False


# ─── Privacy helpers ──────────────────────────────────────────────

SALT = "iotmart-analytics-v1"  # rotate periodically to reset tracking


def hash_ip(ip: str) -> str:
    """One-way hash of IP — never reversible."""
    return hashlib.sha256(f"{SALT}:{ip}".encode()).hexdigest()


def make_visitor_id(ip_hash: str, user_agent: str | None) -> str:
    """Stable anonymous visitor ID derived from IP hash + UA."""
    ua = (user_agent or "")[:200]
    return hashlib.sha256(f"{ip_hash}:{ua}".encode()).hexdigest()[:32]


def make_session_id() -> str:
    return secrets.token_hex(16)


# ─── UA parsing (graceful — user-agents package is optional) ───

def parse_user_agent(ua_string: str | None) -> dict[str, str | None]:
    if not ua_string:
        return {"browser": None, "browser_version": None, "os": None, "device_type": "unknown"}
    try:
        from user_agents import parse  # type: ignore
        ua = parse(ua_string)
        device_type = "bot" if ua.is_bot else ("mobile" if ua.is_mobile else ("tablet" if ua.is_tablet else "desktop"))
        return {
            "browser": ua.browser.family or None,
            "browser_version": ua.browser.version_string or None,
            "os": ua.os.family or None,
            "device_type": device_type,
        }
    except ImportError:
        # Fallback simple detection without the package
        ua_lower = ua_string.lower()
        browser = None
        if "chrome" in ua_lower and "edg" not in ua_lower:
            browser = "Chrome"
        elif "firefox" in ua_lower:
            browser = "Firefox"
        elif "safari" in ua_lower and "chrome" not in ua_lower:
            browser = "Safari"
        elif "edg" in ua_lower:
            browser = "Edge"
        os_name = None
        if "windows" in ua_lower:
            os_name = "Windows"
        elif "mac os" in ua_lower or "macos" in ua_lower:
            os_name = "macOS"
        elif "linux" in ua_lower:
            os_name = "Linux"
        elif "android" in ua_lower:
            os_name = "Android"
        elif "iphone" in ua_lower or "ipad" in ua_lower:
            os_name = "iOS"
        device_type = "mobile" if any(x in ua_lower for x in ["mobile", "android", "iphone"]) else "desktop"
        return {"browser": browser, "browser_version": None, "os": os_name, "device_type": device_type}


# ─── Write operations ───────────────────────────────────────────────

async def record_page_view(
    db: AsyncSession,
    *,
    path: str,
    ip: str,
    user_agent: str | None,
    referrer: str | None,
    session_id: str | None,
    country: str | None = None,
    city: str | None = None,
) -> str:
    """Insert a PageView row. Returns the session_id used."""
    ip_hash = hash_ip(ip)
    visitor_id = make_visitor_id(ip_hash, user_agent)
    sid = session_id or make_session_id()
    ua_info = parse_user_agent(user_agent)

    view = PageView(
        visitor_id=visitor_id,
        session_id=sid,
        ip_hash=ip_hash,
        path=path[:2048],
        referrer=(referrer or "")[:2048] or None,
        user_agent=(user_agent or "")[:1000] or None,
        browser=ua_info["browser"],
        browser_version=ua_info["browser_version"],
        os=ua_info["os"],
        device_type=ua_info["device_type"],
        country=country,
        city=city,
    )
    db.add(view)
    await db.flush()
    return sid


async def upsert_online_visitor(
    db: AsyncSession,
    *,
    session_id: str,
    visitor_id: str,
    path: str,
) -> None:
    existing = await db.get(OnlineVisitor, session_id)
    if existing:
        existing.last_seen = datetime.now(timezone.utc)
        existing.path = path[:2048]
    else:
        db.add(OnlineVisitor(
            session_id=session_id,
            visitor_id=visitor_id,
            path=path[:2048],
        ))
    await db.flush()


async def prune_online_visitors(db: AsyncSession, ttl_seconds: int = 300) -> None:
    """Remove sessions not seen for TTL seconds."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=ttl_seconds)
    await db.execute(delete(OnlineVisitor).where(OnlineVisitor.last_seen < cutoff))
    await db.flush()


async def update_duration(
    db: AsyncSession, session_id: str, path: str, duration_ms: int
) -> None:
    """Update duration on the most recent PageView for this session+path."""
    result = await db.execute(
        select(PageView)
        .where(PageView.session_id == session_id, PageView.path == path)
        .order_by(PageView.created_at.desc())
        .limit(1)
    )
    view = result.scalar_one_or_none()
    if view and view.duration_ms is None:
        view.duration_ms = max(0, min(duration_ms, 86_400_000))
    await db.flush()


# ─── Read / aggregation operations ─────────────────────────────────────

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def get_summary(db: AsyncSession) -> dict[str, Any]:
    now = _now_utc()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    async def _count_views(since: datetime) -> int:
        r = await db.execute(select(func.count()).select_from(PageView).where(PageView.created_at >= since))
        return r.scalar_one() or 0

    async def _count_unique(since: datetime) -> int:
        r = await db.execute(
            select(func.count(distinct(PageView.visitor_id)))
            .select_from(PageView)
            .where(PageView.created_at >= since)
        )
        return r.scalar_one() or 0

    # total unique visitors ever
    total_unique_r = await db.execute(select(func.count(distinct(PageView.visitor_id))).select_from(PageView))
    total_unique = total_unique_r.scalar_one() or 0

    total_views_r = await db.execute(select(func.count()).select_from(PageView))
    total_views = total_views_r.scalar_one() or 0

    online_count_r = await db.execute(
        select(func.count()).select_from(OnlineVisitor)
        .where(OnlineVisitor.last_seen >= now - timedelta(minutes=5))
    )
    online_count = online_count_r.scalar_one() or 0

    return {
        "visitors_today": await _count_unique(today_start),
        "visitors_this_week": await _count_unique(week_start),
        "visitors_this_month": await _count_unique(month_start),
        "total_visitors": total_unique,
        "page_views_today": await _count_views(today_start),
        "page_views_total": total_views,
        "online_now": online_count,
    }


async def get_top_pages(db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(
        select(PageView.path, func.count().label("views"), func.count(distinct(PageView.visitor_id)).label("unique_visitors"))
        .group_by(PageView.path)
        .order_by(func.count().desc())
        .limit(limit)
    )
    return [{"path": r.path, "views": r.views, "unique_visitors": r.unique_visitors} for r in result.all()]


async def get_device_breakdown(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(PageView.device_type, func.count().label("count"))
        .where(PageView.device_type.isnot(None))
        .group_by(PageView.device_type)
        .order_by(func.count().desc())
    )
    return [{"device_type": r.device_type, "count": r.count} for r in result.all()]


async def get_browser_breakdown(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(PageView.browser, func.count().label("count"))
        .where(PageView.browser.isnot(None))
        .group_by(PageView.browser)
        .order_by(func.count().desc())
        .limit(8)
    )
    return [{"browser": r.browser, "count": r.count} for r in result.all()]


async def get_country_breakdown(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(PageView.country, func.count().label("count"))
        .where(PageView.country.isnot(None))
        .group_by(PageView.country)
        .order_by(func.count().desc())
        .limit(10)
    )
    return [{"country": r.country, "count": r.count} for r in result.all()]


async def get_daily_trend(db: AsyncSession, days: int = 30) -> list[dict]:
    """Unique visitors per day for the last N days."""
    since = _now_utc() - timedelta(days=days)
    result = await db.execute(
        select(
            func.date_trunc('day', PageView.created_at).label("day"),
            func.count(distinct(PageView.visitor_id)).label("unique_visitors"),
            func.count().label("page_views"),
        )
        .where(PageView.created_at >= since)
        .group_by(func.date_trunc('day', PageView.created_at))
        .order_by(func.date_trunc('day', PageView.created_at))
    )
    return [
        {"day": r.day.strftime("%Y-%m-%d"), "unique_visitors": r.unique_visitors, "page_views": r.page_views}
        for r in result.all()
    ]


# ─── Daily rollup / retention ─────────────────────────────────────────

async def run_daily_rollup(db: AsyncSession, day: date | None = None) -> int:
    """Aggregate one day of `page_views` into a `DailyAnalytics` row.

    Defaults to yesterday (the most recent complete day).  Upserts via
    `INSERT ... ON CONFLICT (day) DO UPDATE` so re-running is safe and
    idempotent.  Returns the number of page views rolled up for the day.
    """
    target = day or (_now_utc() - timedelta(days=1)).date()
    day_start = datetime.combine(target, time.min, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    window = and_(
        PageView.created_at >= day_start,
        PageView.created_at < day_end,
    )

    views_r = await db.execute(
        select(func.count()).select_from(PageView).where(window)
    )
    views = views_r.scalar_one() or 0

    visitors_r = await db.execute(
        select(func.count(distinct(PageView.visitor_id)))
        .select_from(PageView)
        .where(window)
    )
    visitors = visitors_r.scalar_one() or 0

    sessions_r = await db.execute(
        select(func.count(distinct(PageView.session_id)))
        .select_from(PageView)
        .where(window)
    )
    sessions = sessions_r.scalar_one() or 0

    duration_r = await db.execute(
        select(func.avg(PageView.duration_ms))
        .select_from(PageView)
        .where(window, PageView.duration_ms.isnot(None))
    )
    avg_duration_ms = duration_r.scalar_one_or_none()
    avg_duration_ms = int(round(avg_duration_ms)) if avg_duration_ms is not None else None

    top_paths_r = await db.execute(
        select(PageView.path, func.count().label("views"))
        .select_from(PageView)
        .where(window)
        .group_by(PageView.path)
        .order_by(func.count().desc())
        .limit(20)
    )
    top_paths = [{"path": r.path, "views": r.views} for r in top_paths_r.all()]

    async def _breakdown(col: Any, key: str) -> list[dict]:
        result = await db.execute(
            select(col, func.count().label("count"))
            .select_from(PageView)
            .where(window, col.isnot(None))
            .group_by(col)
            .order_by(func.count().desc())
        )
        return [{key: getattr(r, key), "count": r.count} for r in result.all()]

    devices = await _breakdown(PageView.device_type, "device_type")
    browsers = await _breakdown(PageView.browser, "browser")
    countries = await _breakdown(PageView.country, "country")

    stmt = pg_insert(DailyAnalytics).values(
        day=target,
        views=views,
        visitors=visitors,
        sessions=sessions,
        avg_duration_ms=avg_duration_ms,
        top_paths=top_paths,
        devices=devices,
        browsers=browsers,
        countries=countries,
    ).on_conflict_do_update(
        index_elements=[DailyAnalytics.day],
        set_={
            "views": stmt.excluded.views,
            "visitors": stmt.excluded.visitors,
            "sessions": stmt.excluded.sessions,
            "avg_duration_ms": stmt.excluded.avg_duration_ms,
            "top_paths": stmt.excluded.top_paths,
            "devices": stmt.excluded.devices,
            "browsers": stmt.excluded.browsers,
            "countries": stmt.excluded.countries,
        },
    )
    await db.execute(stmt)
    await db.flush()
    return views


async def prune_old_views(db: AsyncSession, retention_days: int) -> int:
    """Delete `page_views` older than `retention_days`; return count deleted."""
    cutoff = _now_utc() - timedelta(days=retention_days)
    result = await db.execute(delete(PageView).where(PageView.created_at < cutoff))
    await db.flush()
    return result.rowcount or 0


async def get_daily_rollup(db: AsyncSession, days: int = 30) -> list[DailyAnalytics]:
    """Return DailyAnalytics rows for the last `days` days, newest first."""
    since = (_now_utc() - timedelta(days=days)).date()
    result = await db.execute(
        select(DailyAnalytics)
        .where(DailyAnalytics.day >= since)
        .order_by(DailyAnalytics.day.desc())
    )
    return list(result.scalars().all())

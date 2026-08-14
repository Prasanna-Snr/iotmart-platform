"""
Coverage tests for app.services.analytics_service.

Uses a mocked AsyncSession so no PostgreSQL is needed. Exercises bot
detection, privacy helpers, UA parsing (incl. the no-user_agents fallback),
and every read/write/rollup routine in the service.

Run from the backend directory:
    pytest tests/test_analytics_service.py -v
"""
from __future__ import annotations

import asyncio
import os
import sys
import types
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import patch

from app.models.models import DailyAnalytics, OnlineVisitor, PageView
from app.services import analytics_service as svc


def _db(script):
    """A fake AsyncSession that replays `script` per execute/get call."""
    calls = list(script)

    class _DB:
        def __init__(self):
            self.added = []
            self.flushed = 0

        async def execute(self, *a, **k):
            item = calls.pop(0)
            return item() if callable(item) else item

        async def get(self, *a, **k):
            item = calls.pop(0)
            return item() if callable(item) else item

        def add(self, obj):
            self.added.append(obj)

        async def flush(self):
            self.flushed += 1

    return _DB()


class _Scalar:
    def __init__(self, value):
        self._v = value

    def scalar_one(self):
        return self._v

    def scalar_one_or_none(self):
        return self._v


class _Rows:
    def __init__(self, rows, rowcount=None):
        self._rows = rows
        self.rowcount = rowcount

    def all(self):
        return self._rows

    def scalars(self):
        return _Scalars(self._rows)

    def scalar_one(self):
        return self._rows[0]

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


class _Scalars:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


def _row(**kw):
    return types.SimpleNamespace(**kw)


def _run(coro):
    return asyncio.run(coro)


# ─── Detection & privacy helpers ────────────────────────────────────────────

class TestHelpers:

    def test_should_skip_api(self):
        assert svc.should_skip("/api/products", "Mozilla/5.0") is True

    def test_should_skip_bot(self):
        assert svc.should_skip("/products", "Mozilla/5.0 Googlebot/2.1") is True
        assert svc.should_skip("/products", "python-requests/2.31") is True

    def test_should_skip_normal(self):
        assert svc.should_skip("/products", "Mozilla/5.0 (X11; Linux) Chrome/130") is False

    def test_hash_ip_deterministic(self):
        a = svc.hash_ip("1.2.3.4")
        assert a == svc.hash_ip("1.2.3.4")
        assert a != svc.hash_ip("1.2.3.5")
        assert len(a) == 64

    def test_visitor_id(self):
        v1 = svc.make_visitor_id("h", "Mozilla/5.0" * 40)
        v2 = svc.make_visitor_id("h", "Mozilla/5.0" * 40)
        assert v1 == v2 and len(v1) == 32

    def test_session_id(self):
        assert len(svc.make_session_id()) == 32
        assert svc.make_session_id() != svc.make_session_id()

    def test_parse_ua_none(self):
        assert svc.parse_user_agent(None)["device_type"] == "unknown"

    def test_parse_ua_real(self):
        info = svc.parse_user_agent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        )
        assert info["device_type"] == "mobile"
        assert info["browser"] is not None

    def test_parse_ua_fallback(self):
        with patch.dict("sys.modules", {"user_agents": None}):
            info = svc.parse_user_agent("Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36")
            assert info["browser"] == "Chrome" and info["os"] == "Windows"
            info = svc.parse_user_agent("Mozilla/5.0 (X11; Linux) Firefox/120")
            assert info["browser"] == "Firefox" and info["os"] == "Linux"
            # Edge UA containing "Edg": must not be classified as Chrome/Safari
            info = svc.parse_user_agent(
                "Mozilla/5.0 (Linux; Android 13; Pixel 8) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36 Edg/110.0"
            )
            assert info["browser"] == "Edge" and info["os"] == "Linux"
            assert info["device_type"] == "mobile"


# ─── Write operations ───────────────────────────────────────────────────────

class TestWrites:

    def test_record_page_view(self):
        db = _db([])
        sid = _run(svc.record_page_view(
            db, path="/products/1", ip="10.0.0.1",
            user_agent="Mozilla/5.0 Chrome/130", referrer="https://x.com/a",
            session_id=None, country="US", city="NYC",
        ))
        assert len(sid) == 32
        assert db.flushed == 1 and len(db.added) == 1
        assert db.added[0].path == "/products/1"

    def test_record_page_view_truncation(self):
        db = _db([])
        _run(svc.record_page_view(
            db, path="x" * 3000, ip="10.0.0.2", user_agent=None,
            referrer=None, session_id="sess", country=None, city=None,
        ))
        assert len(db.added[0].path) <= 2048
        assert db.added[0].referrer is None

    def test_upsert_online_new(self):
        db = _db([None])
        _run(svc.upsert_online_visitor(db, session_id="s", visitor_id="v", path="/p"))
        assert len(db.added) == 1 and db.added[0].session_id == "s"

    def test_upsert_online_existing(self):
        existing = OnlineVisitor(session_id="s", visitor_id="v", path="/old")
        db = _db([existing])
        _run(svc.upsert_online_visitor(db, session_id="s", visitor_id="v", path="/new"))
        assert existing.path == "/new" and existing.last_seen is not None
        assert db.added == []

    def test_prune_online_visitors(self):
        db = _db([_Rows([])])
        _run(svc.prune_online_visitors(db, ttl_seconds=60))
        assert db.flushed == 1

    def test_update_duration_sets(self):
        view = PageView(visitor_id="v", session_id="s", path="/p")
        db = _db([_Scalar(view)])
        _run(svc.update_duration(db, "s", "/p", 2500))
        assert view.duration_ms == 2500

    def test_update_duration_clamps(self):
        view = PageView(visitor_id="v", session_id="s", path="/p")
        db = _db([_Scalar(view)])
        _run(svc.update_duration(db, "s", "/p", 999_999_999))
        assert view.duration_ms == 86_400_000

    def test_update_duration_negative_clamps(self):
        view = PageView(visitor_id="v", session_id="s", path="/p")
        db = _db([_Scalar(view)])
        _run(svc.update_duration(db, "s", "/p", -5))
        assert view.duration_ms == 0

    def test_update_duration_no_view(self):
        db = _db([_Scalar(None)])
        _run(svc.update_duration(db, "s", "/p", 100))


# ─── Read / aggregation operations ──────────────────────────────────────────

class TestReads:

    def test_get_summary(self):
        db = _db([
            _Scalar(10),   # total_unique
            _Scalar(100),  # total_views
            _Scalar(3),    # online_now
            _Scalar(5),    # visitors_today
            _Scalar(20),   # visitors_this_week
            _Scalar(50),   # visitors_this_month
            _Scalar(7),    # page_views_today
        ])
        out = _run(svc.get_summary(db))
        assert out["total_visitors"] == 10
        assert out["page_views_total"] == 100
        assert out["online_now"] == 3
        assert out["visitors_today"] == 5
        assert out["page_views_today"] == 7

    def test_get_top_pages(self):
        db = _db([_Rows([_row(path="/a", views=5, unique_visitors=2)])])
        out = _run(svc.get_top_pages(db, limit=5))
        assert out[0]["path"] == "/a" and out[0]["views"] == 5

    def test_get_device_breakdown(self):
        db = _db([_Rows([_row(device_type="mobile", count=8)])])
        out = _run(svc.get_device_breakdown(db))
        assert out[0] == {"device_type": "mobile", "count": 8}

    def test_get_browser_breakdown(self):
        db = _db([_Rows([_row(browser="Chrome", count=4)])])
        out = _run(svc.get_browser_breakdown(db))
        assert out[0]["browser"] == "Chrome"

    def test_get_country_breakdown(self):
        db = _db([_Rows([_row(country="US", count=9)])])
        out = _run(svc.get_country_breakdown(db))
        assert out[0] == {"country": "US", "count": 9}

    def test_get_daily_trend(self):
        day = datetime(2026, 8, 1, tzinfo=timezone.utc)
        db = _db([_Rows([_row(day=day, unique_visitors=2, page_views=5)])])
        out = _run(svc.get_daily_trend(db, days=7))
        assert out[0]["day"] == "2026-08-01" and out[0]["unique_visitors"] == 2

    def test_get_daily_rollup(self):
        d = DailyAnalytics(day=date(2026, 8, 1))
        db = _db([_Rows([d])])
        out = _run(svc.get_daily_rollup(db, days=30))
        assert out[0].day == date(2026, 8, 1)


# ─── Daily rollup / retention ───────────────────────────────────────────────

class TestRollup:

    def test_run_daily_rollup(self):
        db = _db([
            _Scalar(12),       # views
            _Scalar(6),        # visitors
            _Scalar(5),        # sessions
            _Scalar(2400.0),   # avg_duration
            _Rows([_row(path="/p", views=4)]),
            _Rows([_row(device_type="desktop", count=3)]),
            _Rows([_row(browser="Chrome", count=2)]),
            _Rows([_row(country="US", count=1)]),
            _Rows([], rowcount=None),  # upsert statement
        ])
        n = _run(svc.run_daily_rollup(db, day=date(2026, 8, 1)))
        assert n == 12 and db.flushed == 1

    def test_run_daily_rollup_no_duration(self):
        db = _db([
            _Scalar(0),
            _Scalar(0),
            _Scalar(0),
            _Scalar(None),
            _Rows([]),
            _Rows([]),
            _Rows([]),
            _Rows([]),
            _Rows([], rowcount=None),  # upsert statement
        ])
        n = _run(svc.run_daily_rollup(db, day=date(2026, 8, 1)))
        assert n == 0

    def test_prune_old_views(self):
        db = _db([_Rows([], rowcount=17)])
        n = _run(svc.prune_old_views(db, retention_days=90))
        assert n == 17 and db.flushed == 1

    def test_prune_old_views_no_rows(self):
        db = _db([_Rows([], rowcount=None)])
        n = _run(svc.prune_old_views(db, retention_days=90))
        assert n == 0

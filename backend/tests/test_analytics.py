"""
Tests for the analytics system.
Runs with pytest + pytest-asyncio.

Run from the backend directory:
    pytest tests/test_analytics.py -v
"""
from __future__ import annotations

import sys
import os

# Ensure backend/ is on the path (mirrors conftest.py)
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.services.analytics_service import (
    BOT_PATTERN,
    SKIP_PATHS,
    hash_ip,
    make_visitor_id,
    parse_user_agent,
    should_skip,
)

# ─── App bootstrap ────────────────────────────────────────────────────────────
# Import app after sys.path is set; no SMTP patches needed for analytics tests.
from main import app  # noqa: E402
from app.database import get_db

client = TestClient(app, raise_server_exceptions=False)


# ─── DB mock helpers ──────────────────────────────────────────────────────────

def _make_mock_db():
    """Return an AsyncMock that stands in for an AsyncSession."""
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.close = AsyncMock()
    return db


def _db_override(db):
    """Return an async-generator factory suitable for app.dependency_overrides[get_db]."""
    async def _override():
        try:
            yield db
            await db.commit()
        except Exception:
            await db.rollback()
            raise
        finally:
            await db.close()
    return _override


# ─── Unit tests: should_skip ───────────────────────────────────────────────────

def test_should_skip_admin_path():
    assert should_skip("/admin/analytics", "Mozilla/5.0") is True


def test_should_skip_api_path():
    assert should_skip("/api/products", "Mozilla/5.0") is True


def test_should_skip_next_assets():
    assert should_skip("/_next/static/chunk.js", "Mozilla/5.0") is True


def test_should_skip_sitemap():
    assert should_skip("/sitemap.xml", "Mozilla/5.0") is True


def test_should_not_skip_homepage():
    assert should_skip("/", "Mozilla/5.0") is False


def test_should_not_skip_product_page():
    assert should_skip("/products/arduino-uno", "Mozilla/5.0") is False


def test_should_not_skip_tutorial_page():
    assert should_skip("/tutorials/blink-led", "Mozilla/5.0") is False


def test_should_skip_googlebot():
    assert should_skip("/products", "Googlebot/2.1 (+http://www.google.com/bot.html)") is True


def test_should_skip_generic_bot():
    assert should_skip("/", "python-requests/2.31.0") is True


def test_should_skip_curl():
    assert should_skip("/", "curl/7.88.0") is True


def test_should_skip_none_ua_on_api():
    # /api/* matches SKIP_PATHS regardless of UA
    assert should_skip("/api/health", None) is True


def test_should_not_skip_none_ua_on_page():
    # No UA on a non-bot, non-skip path — allow it (UA could be stripped by proxy)
    assert should_skip("/products", None) is False


# ─── Unit tests: privacy helpers ──────────────────────────────────────────────

def test_hash_ip_is_deterministic():
    h1 = hash_ip("1.2.3.4")
    h2 = hash_ip("1.2.3.4")
    assert h1 == h2


def test_hash_ip_different_ips():
    assert hash_ip("1.2.3.4") != hash_ip("5.6.7.8")


def test_hash_ip_not_raw():
    raw = "192.168.1.1"
    h = hash_ip(raw)
    assert raw not in h
    assert len(h) == 64  # SHA-256 hex digest


def test_visitor_id_stable():
    ip_hash = hash_ip("10.0.0.1")
    ua = "Mozilla/5.0 (Windows NT 10.0)"
    v1 = make_visitor_id(ip_hash, ua)
    v2 = make_visitor_id(ip_hash, ua)
    assert v1 == v2


def test_visitor_id_differs_by_ua():
    ip_hash = hash_ip("10.0.0.1")
    v1 = make_visitor_id(ip_hash, "Chrome")
    v2 = make_visitor_id(ip_hash, "Firefox")
    assert v1 != v2


def test_visitor_id_length():
    h = hash_ip("1.2.3.4")
    vid = make_visitor_id(h, "Mozilla")
    assert len(vid) == 32


# ─── Unit tests: UA parsing ────────────────────────────────────────────────────

def test_parse_ua_none():
    result = parse_user_agent(None)
    assert result["device_type"] == "unknown"
    assert result["browser"] is None


def test_parse_ua_chrome_desktop():
    ua = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    result = parse_user_agent(ua)
    # Both the user-agents package and the fallback should detect Chrome and desktop
    assert result["browser"] is not None
    assert result["device_type"] in ("desktop", "mobile", "tablet")  # at minimum not unknown


def test_parse_ua_mobile():
    ua = (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    )
    result = parse_user_agent(ua)
    assert result["device_type"] in ("mobile", "tablet")


def test_parse_ua_empty_string():
    result = parse_user_agent("")
    assert result["browser"] is None


# ─── Integration-style: API endpoint tests ────────────────────────────────────
# These drive the FastAPI app via TestClient with the DB dependency overridden.
#
# FastAPI resolves Depends(get_db) using the function object captured at import
# time, so patching the module attribute doesn't work.  The correct approach is
# app.dependency_overrides[get_db], which must be an async generator factory to
# match the original get_db signature.


def test_track_endpoint_skips_admin():
    """POST /api/analytics/track should return 204 and skip admin paths."""
    db = _make_mock_db()
    app.dependency_overrides[get_db] = _db_override(db)
    try:
        resp = client.post(
            "/api/analytics/track",
            json={"path": "/admin/analytics", "referrer": None, "session_id": None},
            headers={"user-agent": "Mozilla/5.0"},
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 204
    # Path was skipped — no PageView row should have been inserted
    db.add.assert_not_called()


def test_track_endpoint_skips_bot():
    """POST /api/analytics/track should return 204 and skip bot user-agents."""
    db = _make_mock_db()
    app.dependency_overrides[get_db] = _db_override(db)
    try:
        resp = client.post(
            "/api/analytics/track",
            json={"path": "/products", "referrer": None, "session_id": None},
            headers={"user-agent": "Googlebot/2.1"},
        )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 204
    db.add.assert_not_called()


def test_track_endpoint_records_valid_view():
    """POST /api/analytics/track should insert a PageView for a real browser on a public page."""
    db = _make_mock_db()

    # Stub the background task so it doesn't attempt to open a real DB connection.
    async def _noop_bg(*args, **kwargs):
        pass

    app.dependency_overrides[get_db] = _db_override(db)
    try:
        with patch("app.routers.analytics._bg_upsert_and_prune", side_effect=_noop_bg):
            resp = client.post(
                "/api/analytics/track",
                json={
                    "path": "/products/arduino-uno",
                    "referrer": "https://google.com",
                    "session_id": None,
                },
                headers={"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"},
            )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 204
    # A PageView row must have been added to the session
    db.add.assert_called_once()


def test_summary_requires_auth():
    """GET /api/analytics/summary should reject requests without a valid token."""
    resp = client.get("/api/analytics/summary")
    assert resp.status_code in (401, 403)

"""
Coverage tests for the tutorials and admin routers.

Reuses the mocked-DB / mocked-auth helpers from test_store_routes.py so these
suites run without PostgreSQL. Pushes the tutorials and admin routers toward
the coverage targets.

Run from the backend directory:
    pytest tests/test_tutorials_admin.py -v
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from main import app  # noqa: E402
from app.models.models import (  # noqa: E402
    AdminAuditLog,
    Order,
    Tutorial,
    TutorialCategory,
    User,
)
from app.security import get_current_admin  # noqa: E402

from tests.test_store_routes import (  # noqa: E402
    _Result,
    _clear_overrides,
    _mk_db,
    _mk_user,
    _now,
    _override_db,
    _use_auth,
    _use_db,
)

client = TestClient(app, raise_server_exceptions=False)


def _mk_tutorial_category(slug: str = "esp32"):
    return TutorialCategory(
        id=uuid.uuid4(), name="ESP32", slug=slug, description="d", icon="chip",
        created_at=_now(),
    )


def _mk_tutorial(slug: str = "blink-led", category=None, views: int = 0):
    cat = category or _mk_tutorial_category()
    t = Tutorial(
        id=uuid.uuid4(), title="ESP32 Blink", slug=slug, description="desc",
        short_description="sd", difficulty="Beginner", estimated_time="10m",
        components=[], sensors=[], microcontrollers=[], circuit_diagram=None,
        wiring_instructions=[], source_code="", code_language="cpp", steps=[],
        prerequisites=[], learning_outcomes=[], related_product_ids=[],
        related_tutorial_ids=[], cover_image="", views=views, featured=False,
        published=True, author="IoTMart", tags=[], category_id=cat.id,
        created_at=_now(), updated_at=_now(),
    )
    t.category = cat
    return t


def _mk_order_created(created_at, total=100.0, status="delivered", items=None):
    return Order(
        id=uuid.uuid4(), order_number=f"ORD-{uuid.uuid4().hex[:8]}", user_id=uuid.uuid4(),
        customer_email="c@example.com", items=items or [], shipping_address={},
        status=status, subtotal=total, shipping_cost=0.0, discount_amount=0.0,
        coupon_code=None, total=total, payment_method="cod", payment_status="paid",
        notes=None, created_at=created_at, updated_at=created_at,
    )


def _mk_audit_entry():
    return AdminAuditLog(
        id=uuid.uuid4(), actor_id=uuid.uuid4(), actor_email="admin@x.com",
        action="product.create", target_type="product", target_id=str(uuid.uuid4()),
        detail="created", created_at=_now(),
    )


# ─── Tutorials ───────────────────────────────────────────────────────────────

class TestTutorials:

    def test_list_categories(self):
        _use_db(_mk_db([_Result(rows=[_mk_tutorial_category()])]))
        try:
            resp = client.get("/api/tutorials/categories")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and len(resp.json()) == 1

    def test_create_category(self):
        _use_auth(admin=_mk_user(role="admin"))
        cat = _mk_tutorial_category()
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.post("/api/tutorials/categories",
                               json={"name": "New", "slug": "new"})
        finally:
            _clear_overrides()
        assert resp.status_code == 201

    def test_create_category_duplicate_slug(self):
        _use_auth(admin=_mk_user(role="admin"))
        cat = _mk_tutorial_category()
        _use_db(_mk_db([_Result(scalar_one_or_none=cat)]))
        try:
            resp = client.post("/api/tutorials/categories",
                               json={"name": "X", "slug": cat.slug})
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_update_category(self):
        _use_auth(admin=_mk_user(role="admin"))
        cat = _mk_tutorial_category()
        _use_db(_mk_db([_Result(scalar_one_or_none=cat)]))
        try:
            resp = client.put(f"/api/tutorials/categories/{cat.id}",
                              json={"name": "Updated", "slug": "updated"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["name"] == "Updated"

    def test_update_category_404(self):
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.put(f"/api/tutorials/categories/{uuid.uuid4()}",
                              json={"name": "X", "slug": "x"})
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_delete_category(self):
        _use_auth(admin=_mk_user(role="admin"))
        cat = _mk_tutorial_category()
        _use_db(_mk_db([_Result(scalar_one_or_none=cat)]))
        try:
            resp = client.delete(f"/api/tutorials/categories/{cat.id}")
        finally:
            _clear_overrides()
        assert resp.status_code == 204

    def test_delete_category_404(self):
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.delete(f"/api/tutorials/categories/{uuid.uuid4()}")
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_delete_category_integrity_error(self):
        from sqlalchemy.exc import IntegrityError

        _use_auth(admin=_mk_user(role="admin"))
        cat = _mk_tutorial_category()
        db = _mk_db([_Result(scalar_one_or_none=cat)])

        async def flush():
            raise IntegrityError("stmt", {}, BaseException())

        db.flush = flush
        _use_db(db)
        try:
            resp = client.delete(f"/api/tutorials/categories/{cat.id}")
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_list_tutorials_no_filters(self):
        t = _mk_tutorial()
        _use_db(_mk_db([_Result(scalar_one=1), _Result(rows=[t])]))
        try:
            resp = client.get("/api/tutorials")
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert resp.json()["total"] == 1 and len(resp.json()["items"]) == 1

    def test_list_tutorials_with_filters(self):
        cat = _mk_tutorial_category()
        t = _mk_tutorial(category=cat)
        _use_db(_mk_db([
            _Result(scalar_one_or_none=cat),
            _Result(scalar_one=1),
            _Result(rows=[t]),
        ]))
        try:
            resp = client.get("/api/tutorials", params={
                "category": "esp32", "difficulty": "Beginner", "featured": "false",
                "published": "true", "search": "blink", "page": 1, "page_size": 10,
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["page_size"] == 10

    def test_list_tutorials_unknown_category(self):
        _use_db(_mk_db([
            _Result(scalar_one_or_none=None),
            _Result(scalar_one=0),
            _Result(rows=[]),
        ]))
        try:
            resp = client.get("/api/tutorials", params={"category": "missing"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["total"] == 0

    def test_get_tutorial_increments_views(self):
        t = _mk_tutorial(views=0)
        _use_db(_mk_db([_Result(scalar_one_or_none=t)]))
        try:
            resp = client.get(f"/api/tutorials/{t.slug}")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and t.views == 1

    def test_get_tutorial_404(self):
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.get("/api/tutorials/missing")
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_create_tutorial(self):
        _use_auth(admin=_mk_user(role="admin"))
        cat = _mk_tutorial_category()
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.post("/api/tutorials", json={
                "title": "New", "slug": "new", "category_id": str(cat.id),
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 201

    def test_create_tutorial_duplicate_slug(self):
        _use_auth(admin=_mk_user(role="admin"))
        t = _mk_tutorial()
        _use_db(_mk_db([_Result(scalar_one_or_none=t)]))
        try:
            resp = client.post("/api/tutorials", json={
                "title": "X", "slug": t.slug, "category_id": str(uuid.uuid4()),
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_update_tutorial(self):
        _use_auth(admin=_mk_user(role="admin"))
        t = _mk_tutorial()
        _use_db(_mk_db([_Result(scalar_one_or_none=t), _Result(scalar_one=t)]))
        try:
            resp = client.put(f"/api/tutorials/{t.id}", json={"title": "Renamed"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["title"] == "Renamed"

    def test_update_tutorial_404(self):
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.put(f"/api/tutorials/{uuid.uuid4()}", json={"title": "X"})
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_delete_tutorial(self):
        _use_auth(admin=_mk_user(role="admin"))
        t = _mk_tutorial()
        _use_db(_mk_db([_Result(scalar_one_or_none=t)]))
        try:
            resp = client.delete(f"/api/tutorials/{t.id}")
        finally:
            _clear_overrides()
        assert resp.status_code == 204

    def test_delete_tutorial_404(self):
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.delete(f"/api/tutorials/{uuid.uuid4()}")
        finally:
            _clear_overrides()
        assert resp.status_code == 404


# ─── Admin ───────────────────────────────────────────────────────────────────

class TestAdmin:

    def test_month_bounds_december(self):
        from app.routers.admin import _month_bounds
        start, end = _month_bounds(datetime(2026, 12, 15, tzinfo=timezone.utc))
        assert start.month == 12 and end.year == 2027 and end.month == 1

    def test_dashboard_mixed_orders(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        now = _now()
        this_month = _mk_order_created(
            now, total=1000.0,
            items=[{"product_name": "Sensor", "quantity": 2, "price": 500.0}],
        )
        cancelled = _mk_order_created(now, total=500.0, status="cancelled")
        prev_month = _mk_order_created(
            datetime(now.year, now.month - 1 if now.month > 1 else 1, 1, tzinfo=timezone.utc),
            total=2000.0,
        )
        users = [_mk_user(), _mk_user()]
        for u in users:
            u.created_at = now

        _use_auth(admin=admin)
        _use_db(_mk_db([
            _Result(rows=[this_month, cancelled, prev_month]),
            _Result(rows=users),
            _Result(scalar_one=3),
        ]))
        try:
            resp = client.get("/api/admin/dashboard")
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        body = resp.json()
        assert body["stats"]["total_revenue"] == 3000.0
        assert body["stats"]["total_orders"] == 3
        assert body["stats"]["total_customers"] == 2
        assert body["stats"]["total_products"] == 3
        assert body["stats"]["revenue_change"] == -50.0
        assert body["top_products"][0]["name"] == "Sensor"
        assert body["top_products"][0]["sold"] == 2
        assert len(body["monthly_revenue"]) == 6
        assert len(body["recent_orders"]) >= 1

    def test_dashboard_empty(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(rows=[]), _Result(rows=[]), _Result(scalar_one=0)]))
        try:
            resp = client.get("/api/admin/dashboard")
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        body = resp.json()
        assert body["stats"]["total_revenue"] == 0.0
        assert body["stats"]["total_orders"] == 0
        assert body["stats"]["revenue_change"] == 0.0
        assert body["top_products"] == []

    def test_dashboard_january_wraps_year(self):
        """January forces the monthly series and prev-month to wrap years."""
        class _JanDatetime(datetime):
            @classmethod
            def now(cls, tz=None):
                return datetime(2026, 1, 15, tzinfo=timezone.utc)

        admin = _mk_user(role="admin", email="admin@x.com")
        jan = _mk_order_created(datetime(2026, 1, 2, tzinfo=timezone.utc), total=100.0)
        dec = _mk_order_created(datetime(2025, 12, 2, tzinfo=timezone.utc), total=50.0)
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(rows=[jan, dec]), _Result(rows=[]), _Result(scalar_one=0)]))
        try:
            with patch("app.routers.admin.datetime", _JanDatetime):
                resp = client.get("/api/admin/dashboard")
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        labels = [m["label"] for m in resp.json()["monthly_revenue"]]
        assert labels == ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"]
        assert resp.json()["monthly_revenue"][-1]["value"] == 100.0

    def test_audit_log(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        entry = _mk_audit_entry()
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(rows=[entry])]))
        try:
            resp = client.get("/api/admin/audit")
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 1
        assert body[0]["action"] == "product.create"
        assert body[0]["actor_email"] == "admin@x.com"

    def test_audit_log_empty(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(rows=[])]))
        try:
            resp = client.get("/api/admin/audit")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json() == []

    def test_audit_log_actor_id_none(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        entry = _mk_audit_entry()
        entry.actor_id = None
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(rows=[entry])]))
        try:
            resp = client.get("/api/admin/audit")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()[0]["actor_id"] is None

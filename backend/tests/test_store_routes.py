"""
Coverage tests for the store routes: products, orders, reviews, uploads.

These exercise the HTTP layer (FastAPI TestClient) with the database session
and the auth dependencies mocked out, so no PostgreSQL is required. They exist
to lift per-module coverage on the four store routers toward the 80% target.

Run from the backend directory:
    pytest tests/test_store_routes.py -v
"""
from __future__ import annotations

import io
import os
import sys
import uuid
from datetime import datetime, timezone

# Ensure backend/ is on the path (mirrors conftest.py).
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app  # noqa: E402
from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.models.models import (  # noqa: E402
    Brand,
    Category,
    Order,
    Product,
    ProductReview,
    User,
)
from app.security import get_current_admin, get_current_user  # noqa: E402

client = TestClient(app, raise_server_exceptions=False)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _site_setting(value: str):
    return type("SiteSetting", (), {"key": "x", "value": value})()


class _Result:
    """Small result stub so tests do not depend on MagicMock auto-attributes."""

    def __init__(self, scalar_one=None, scalar_one_or_none=None, rows=None,
                 _missing=object()):
        self._scalar_one = scalar_one if scalar_one is not _missing else None
        self._scalar_one_or_none = (
            scalar_one_or_none if scalar_one_or_none is not _missing else None
        )
        self._rows = rows if rows is not None else []

    def scalar_one(self):
        return self._scalar_one

    def scalar_one_or_none(self):
        return self._scalar_one_or_none

    def scalars(self):
        return self

    def all(self):
        return self._rows

    def fetchall(self):
        return self._rows


def _apply_defaults(db):
    """Apply SQLAlchemy column defaults to objects added on the mocked session,
    mirroring what a real INSERT/flush would set (created_at, verified, ...)."""
    from sqlalchemy import inspect

    for call in db.add.call_args_list:
        obj = call.args[0]
        mapper = inspect(type(obj)).mapper
        for attr in mapper.column_attrs:
            col = attr.columns[0]
            if getattr(obj, attr.key, None) is None and col.default is not None:
                arg = col.default.arg
                setattr(obj, attr.key, arg(None) if callable(arg) else arg)


def _mk_db(sequence):
    """AsyncSession whose execute() pops prepared results in order."""
    db = AsyncMock()
    calls = iter(sequence)

    async def execute(stmt, **kwargs):
        try:
            return next(calls)
        except StopIteration:
            return _Result()

    async def flush():
        _apply_defaults(db)

    db.execute = execute
    db.add = MagicMock()
    db.flush = flush
    db.delete = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.close = AsyncMock()
    return db


def _override_db(db):
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


def _mk_user(email: str = "cust@example.com", role: str = "customer", name: str = "Test User"):
    return User(id=uuid.uuid4(), email=email, name=name, role=role)


def _mk_category(slug: str = "mcu"):
    return Category(
        id=uuid.uuid4(), name=slug, slug=slug, description="d", image="",
        created_at=_now(),
    )


def _mk_brand(slug: str = "espressif"):
    return Brand(id=uuid.uuid4(), name=slug, slug=slug, logo=None, created_at=_now())


def _mk_product(name="NodeMCU ESP8266", slug="nodemcu-esp8266", price=1000.0,
                stock=10, in_stock=True, featured=False, category=None, brand=None,
                images=None):
    cat = category or _mk_category()
    br = brand or _mk_brand()
    p = Product(
        id=uuid.uuid4(), name=name, slug=slug, sku=f"SKU-{uuid.uuid4().hex[:8]}",
        description="desc", short_description="sd", price=price, original_price=None,
        currency="USD", images=images if images is not None else ["/uploads/a.png"],
        tags=["iot"], specs=[], stock=stock, rating=4.5, review_count=1,
        featured=featured, new_arrival=False, best_seller=False, in_stock=in_stock,
        weight="10g", dimensions="1x1", related_product_ids=[], category_id=cat.id,
        brand_id=br.id, created_at=_now(), updated_at=_now(),
    )
    p.category = cat
    p.brand = br
    p.reviews = []
    return p


def _mk_review(product=None, user=None, verified=False, rating=5):
    p = product or _mk_product()
    u = user or _mk_user()
    r = ProductReview(
        id=uuid.uuid4(), product_id=p.id, user_id=u.id, user_name=u.name,
        user_avatar=None, rating=rating, title="Great", body="Nice", verified=verified,
        created_at=_now(),
    )
    r.product = p
    return r


def _mk_order(user=None, status="pending", total=1100.0, items=None, email=None):
    u = user or _mk_user()
    o = Order(
        id=uuid.uuid4(), order_number="ORD-ABC12345", user_id=u.id,
        customer_email=email or u.email, items=items or [], shipping_address={},
        status=status, subtotal=1000.0, shipping_cost=100.0, discount_amount=0.0,
        coupon_code=None, total=total, payment_method="cod", payment_status="pending",
        notes=None, created_at=_now(), updated_at=_now(),
    )
    return o


def _use_db(db):
    app.dependency_overrides[get_db] = _override_db(db)


def _use_auth(user: User | None = None, admin: User | None = None):
    u = user or _mk_user()
    a = admin or u
    app.dependency_overrides[get_current_user] = lambda: u
    app.dependency_overrides[get_current_admin] = lambda: a
    return u, a


def _clear_overrides():
    app.dependency_overrides.clear()


# ─── Products ────────────────────────────────────────────────────────────────

class TestProducts:

    def test_list_products_no_filters(self):
        p = _mk_product()
        db = _mk_db([_Result(scalar_one=2), _Result(rows=[p, _mk_product(name="B", slug="b")])])
        _use_db(db)
        try:
            resp = client.get("/api/products")
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2 and len(body["items"]) == 2
        assert body["page"] == 1 and body["page_size"] == 20

    def test_list_products_with_filters(self):
        cat, brand = _mk_category(), _mk_brand()
        p = _mk_product(category=cat, brand=brand)
        db = _mk_db([
            _Result(scalar_one_or_none=cat),
            _Result(scalar_one_or_none=brand),
            _Result(scalar_one=1),
            _Result(rows=[p]),
        ])
        _use_db(db)
        try:
            resp = client.get("/api/products", params={
                "category": "mcu", "brand": "espressif", "search": "esp",
                "min_price": 10, "max_price": 2000, "featured": "true",
                "in_stock": "true", "page": 2, "page_size": 5,
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert resp.json()["page"] == 2 and resp.json()["page_size"] == 5

    def test_list_products_unknown_category_and_brand(self):
        db = _mk_db([
            _Result(scalar_one_or_none=None),
            _Result(scalar_one_or_none=None),
            _Result(scalar_one=0),
            _Result(rows=[]),
        ])
        _use_db(db)
        try:
            resp = client.get("/api/products", params={"category": "nope", "brand": "nope"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["total"] == 0

    def test_list_products_invalid_page_422(self):
        _use_db(_mk_db([]))
        try:
            resp = client.get("/api/products", params={"page": 0})
        finally:
            _clear_overrides()
        assert resp.status_code == 422

    def test_get_product_by_id(self):
        p = _mk_product()
        db = _mk_db([_Result(scalar_one_or_none=p)])
        _use_db(db)
        try:
            resp = client.get(f"/api/products/id/{p.id}")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["slug"] == p.slug

    def test_get_product_by_id_404(self):
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.get(f"/api/products/id/{uuid.uuid4()}")
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_get_product_by_slug(self):
        p = _mk_product()
        _use_db(_mk_db([_Result(scalar_one_or_none=p)]))
        try:
            resp = client.get(f"/api/products/{p.slug}")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and str(resp.json()["id"]) == str(p.id)

    def test_get_product_by_slug_404(self):
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.get("/api/products/does-not-exist")
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_create_product(self):
        p = _mk_product()
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=None), _Result(scalar_one=p)]))
        try:
            resp = client.post("/api/products", json={
                "name": p.name, "slug": p.slug, "sku": p.sku, "price": 1000.0,
                "category_id": str(p.category_id),
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 201 and resp.json()["slug"] == p.slug

    def test_create_product_duplicate_slug(self):
        p = _mk_product()
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=p)]))
        try:
            resp = client.post("/api/products", json={
                "name": "x", "slug": p.slug, "sku": "S", "price": 1.0,
                "category_id": str(uuid.uuid4()),
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_update_product(self):
        p = _mk_product()
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=p), _Result(scalar_one=p)]))
        try:
            resp = client.put(f"/api/products/{p.id}", json={"price": 2000.0})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["price"] == 2000.0

    def test_update_product_404(self):
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.put(f"/api/products/{uuid.uuid4()}", json={"price": 1.0})
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_delete_product(self):
        p = _mk_product()
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=p)]))
        try:
            resp = client.delete(f"/api/products/{p.id}")
        finally:
            _clear_overrides()
        assert resp.status_code == 204

    def test_delete_product_404(self):
        _use_auth(admin=_mk_user(role="admin"))
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.delete(f"/api/products/{uuid.uuid4()}")
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_add_review(self):
        p = _mk_product()
        _use_auth(user=_mk_user())
        db = _mk_db([
            _Result(scalar_one_or_none=p),
            _Result(scalar_one_or_none=None),
            _Result(rows=[(5,)]),
        ])
        _use_db(db)
        try:
            resp = client.post(f"/api/products/{p.id}/reviews",
                               json={"rating": 5, "title": "Great", "body": "Nice"})
        finally:
            _clear_overrides()
        assert resp.status_code == 201 and resp.json()["rating"] == 5

    def test_add_review_product_404(self):
        _use_auth(user=_mk_user())
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.post(f"/api/products/{uuid.uuid4()}/reviews",
                               json={"rating": 5, "title": "t"})
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_add_review_duplicate(self):
        p = _mk_product()
        existing = _mk_review(product=p)
        _use_auth(user=_mk_user())
        _use_db(_mk_db([_Result(scalar_one_or_none=p), _Result(scalar_one_or_none=existing)]))
        try:
            resp = client.post(f"/api/products/{p.id}/reviews",
                               json={"rating": 4, "title": "again"})
        finally:
            _clear_overrides()
        assert resp.status_code == 409


# ─── Orders ──────────────────────────────────────────────────────────────────

class TestOrders:

    def test_gen_order_number(self):
        from app.routers.orders import gen_order_number
        n = gen_order_number()
        assert n.startswith("ORD-") and len(n) == 12

    def test_list_orders_customer_flat(self):
        u = _mk_user()
        o = _mk_order(user=u)
        _use_auth(user=u)
        _use_db(_mk_db([_Result(rows=[o])]))
        try:
            resp = client.get("/api/orders")
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert isinstance(resp.json(), list) and len(resp.json()) == 1

    def test_list_orders_admin_paginated(self):
        admin = _mk_user(role="admin")
        o = _mk_order(user=admin)
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(scalar_one=1), _Result(rows=[o])]))
        try:
            resp = client.get("/api/orders", params={"page": 1, "status": "pending",
                                                     "search": "ORD", "page_size": 5})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1 and body["page"] == 1 and len(body["items"]) == 1

    def test_get_order_owner(self):
        u = _mk_user()
        o = _mk_order(user=u)
        _use_auth(user=u)
        _use_db(_mk_db([_Result(scalar_one_or_none=o)]))
        try:
            resp = client.get(f"/api/orders/{o.id}")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["order_number"] == o.order_number

    def test_get_order_404(self):
        u = _mk_user()
        _use_auth(user=u)
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.get(f"/api/orders/{uuid.uuid4()}")
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_get_order_forbidden(self):
        owner = _mk_user()
        other = _mk_user(email="other@example.com")
        o = _mk_order(user=owner)
        _use_auth(user=other)
        _use_db(_mk_db([_Result(scalar_one_or_none=o)]))
        try:
            resp = client.get(f"/api/orders/{o.id}")
        finally:
            _clear_overrides()
        assert resp.status_code == 403

    def test_create_order_no_items(self):
        u = _mk_user()
        _use_auth(user=u)
        _use_db(_mk_db([]))
        try:
            resp = client.post("/api/orders", json={
                "items": [],
                "shipping_address": {
                    "first_name": "A", "last_name": "B", "phone": "1",
                    "address_line1": "s", "city": "c", "state": "s",
                },
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_create_order_missing_product(self):
        u = _mk_user()
        _use_auth(user=u)
        _use_db(_mk_db([_Result(rows=[])]))
        try:
            resp = client.post("/api/orders", json={
                "items": [{"product_id": str(uuid.uuid4()), "quantity": 1}],
                "shipping_address": {
                    "first_name": "A", "last_name": "B", "phone": "1",
                    "address_line1": "s", "city": "c", "state": "s",
                },
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_create_order_invalid_quantity(self):
        u = _mk_user()
        p = _mk_product()
        _use_auth(user=u)
        _use_db(_mk_db([_Result(rows=[p])]))
        try:
            resp = client.post("/api/orders", json={
                "items": [{"product_id": str(p.id), "quantity": 0}],
                "shipping_address": {
                    "first_name": "A", "last_name": "B", "phone": "1",
                    "address_line1": "s", "city": "c", "state": "s",
                },
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_create_order_insufficient_stock(self):
        u = _mk_user()
        p = _mk_product(stock=2)
        _use_auth(user=u)
        _use_db(_mk_db([_Result(rows=[p])]))
        try:
            resp = client.post("/api/orders", json={
                "items": [{"product_id": str(p.id), "quantity": 5}],
                "shipping_address": {
                    "first_name": "A", "last_name": "B", "phone": "1",
                    "address_line1": "s", "city": "c", "state": "s",
                },
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 409

    @patch("app.routers.orders.send_new_order_email", new=AsyncMock())
    @patch("app.routers.orders.send_order_confirmation_email", new=AsyncMock())
    def test_create_order_success_with_shipping(self):
        u = _mk_user()
        p = _mk_product(price=1000.0, stock=10)
        _use_auth(user=u)
        _use_db(_mk_db([
            _Result(rows=[p]),
            _Result(scalar_one_or_none=None),   # free threshold: default
            _Result(scalar_one_or_none=None),   # default cost: default
            _Result(scalar_one_or_none=None),   # store_email: default
        ]))
        try:
            resp = client.post("/api/orders", json={
                "items": [{"product_id": str(p.id), "quantity": 1}],
                "shipping_address": {
                    "first_name": "A", "last_name": "B", "phone": "1",
                    "address_line1": "s", "city": "c", "state": "s",
                },
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 201
        body = resp.json()
        assert body["subtotal"] == 1000.0
        assert body["shipping_cost"] == 100.0
        assert body["total"] == 1100.0
        assert body["payment_status"] == "pending"

    @patch("app.routers.orders.send_new_order_email", new=AsyncMock())
    @patch("app.routers.orders.send_order_confirmation_email", new=AsyncMock())
    def test_create_order_free_shipping(self):
        u = _mk_user()
        p = _mk_product(price=6000.0, stock=1)
        _use_auth(user=u)
        _use_db(_mk_db([
            _Result(rows=[p]),
            _Result(scalar_one_or_none=_site_setting("5000")),  # threshold
            _Result(scalar_one_or_none=_site_setting("100")),   # cost
            _Result(scalar_one_or_none=_site_setting("shop@x.com")),
        ]))
        try:
            resp = client.post("/api/orders", json={
                "items": [{"product_id": str(p.id), "quantity": 1}],
                "shipping_address": {
                    "first_name": "A", "last_name": "B", "phone": "1",
                    "address_line1": "s", "city": "c", "state": "s",
                },
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 201
        assert resp.json()["shipping_cost"] == 0.0
        assert resp.json()["total"] == 6000.0

    @patch("app.routers.orders.send_new_order_email", new=AsyncMock())
    @patch("app.routers.orders.send_order_confirmation_email", new=AsyncMock())
    @patch("app.coupons.apply_coupon", new=AsyncMock(return_value=(200.0, "SAVE200")))
    def test_create_order_with_coupon(self):
        u = _mk_user()
        p = _mk_product(price=1000.0, stock=3)
        _use_auth(user=u)
        _use_db(_mk_db([
            _Result(rows=[p]),
            _Result(scalar_one_or_none=None),
            _Result(scalar_one_or_none=None),
            _Result(scalar_one_or_none=None),
        ]))
        try:
            resp = client.post("/api/orders", json={
                "items": [{"product_id": str(p.id), "quantity": 1}],
                "shipping_address": {
                    "first_name": "A", "last_name": "B", "phone": "1",
                    "address_line1": "s", "city": "c", "state": "s",
                },
                "coupon_code": "SAVE200",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 201
        body = resp.json()
        assert body["discount_amount"] == 200.0
        assert body["coupon_code"] == "SAVE200"
        assert body["subtotal"] == 800.0
        assert body["total"] == 900.0

    @patch("app.routers.orders.send_order_status_email", new=AsyncMock())
    def test_cancel_order(self):
        u = _mk_user()
        p = _mk_product(stock=2, in_stock=False)
        o = _mk_order(user=u)
        o.items = [{"product_id": str(p.id), "quantity": 2}]
        _use_auth(user=u)
        _use_db(_mk_db([_Result(scalar_one_or_none=o), _Result(scalar_one_or_none=p)]))
        try:
            resp = client.patch(f"/api/orders/{o.id}/cancel")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["status"] == "cancelled"
        assert p.stock == 4 and p.in_stock is True

    def test_cancel_order_404(self):
        u = _mk_user()
        _use_auth(user=u)
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.patch(f"/api/orders/{uuid.uuid4()}/cancel")
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_cancel_order_forbidden(self):
        owner = _mk_user()
        other = _mk_user(email="other@example.com")
        o = _mk_order(user=owner)
        _use_auth(user=other)
        _use_db(_mk_db([_Result(scalar_one_or_none=o)]))
        try:
            resp = client.patch(f"/api/orders/{o.id}/cancel")
        finally:
            _clear_overrides()
        assert resp.status_code == 403

    def test_cancel_order_not_pending(self):
        u = _mk_user()
        o = _mk_order(user=u, status="shipped")
        _use_auth(user=u)
        _use_db(_mk_db([_Result(scalar_one_or_none=o)]))
        try:
            resp = client.patch(f"/api/orders/{o.id}/cancel")
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_update_status_invalid(self):
        admin = _mk_user(role="admin")
        _use_auth(admin=admin)
        _use_db(_mk_db([]))
        try:
            resp = client.patch(f"/api/orders/{uuid.uuid4()}/status", json={"status": "bogus"})
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_update_status_404(self):
        admin = _mk_user(role="admin")
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.patch(f"/api/orders/{uuid.uuid4()}/status", json={"status": "shipped"})
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    @patch("app.routers.orders.send_order_status_email", new=AsyncMock())
    def test_update_status_delivered_grants_rewards(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        customer = _mk_user()
        o = _mk_order(user=customer, total=1000.0)
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(scalar_one_or_none=o), _Result(scalar_one_or_none=None)]))
        try:
            resp = client.patch(f"/api/orders/{o.id}/status", json={"status": "delivered"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert resp.json()["payment_status"] == "paid"

    @patch("app.routers.orders.send_order_status_email", new=AsyncMock())
    def test_update_status_cancelled_restocks(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        u = _mk_user()
        p = _mk_product(stock=0, in_stock=False)
        o = _mk_order(user=u, status="processing")
        o.items = [{"product_id": str(p.id), "quantity": 3}]
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(scalar_one_or_none=o), _Result(scalar_one_or_none=p)]))
        try:
            resp = client.patch(f"/api/orders/{o.id}/status", json={"status": "cancelled"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert p.stock == 3 and p.in_stock is True

    @patch("app.routers.orders.send_order_status_email", new=AsyncMock())
    def test_update_status_shipped_notifies(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        u = _mk_user()
        o = _mk_order(user=u, status="processing")
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(scalar_one_or_none=o)]))
        try:
            resp = client.patch(f"/api/orders/{o.id}/status", json={"status": "shipped"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["status"] == "shipped"


# ─── Reviews ─────────────────────────────────────────────────────────────────

class TestReviews:

    def test_list_reviews_admin(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        r1 = _mk_review()
        r2 = _mk_review(rating=4)
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(rows=[r1, r2])]))
        try:
            resp = client.get("/api/reviews")
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 2
        assert body[0]["product_name"] == r1.product.name

    def test_list_reviews_filtered(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(rows=[])]))
        try:
            resp = client.get("/api/reviews", params={"verified": "true", "search": "bob"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json() == []

    def test_update_review_author(self):
        u = _mk_user()
        p = _mk_product()
        r = _mk_review(product=p, user=u, rating=5)
        _use_auth(user=u)
        _use_db(_mk_db([
            _Result(scalar_one_or_none=r),
            _Result(rows=[(5,), (4,)]),
            _Result(scalar_one_or_none=p),
        ]))
        try:
            resp = client.patch(f"/api/reviews/{r.id}",
                                json={"rating": 4, "body": "Updated"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert resp.json()["rating"] == 4
        assert p.rating == 4.5
        assert p.review_count == 2

    def test_update_review_404(self):
        u = _mk_user()
        _use_auth(user=u)
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.patch(f"/api/reviews/{uuid.uuid4()}", json={"body": "x"})
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_update_review_forbidden(self):
        owner = _mk_user()
        other = _mk_user(email="other@example.com")
        r = _mk_review(user=owner)
        _use_auth(user=other)
        _use_db(_mk_db([_Result(scalar_one_or_none=r)]))
        try:
            resp = client.patch(f"/api/reviews/{r.id}", json={"body": "x"})
        finally:
            _clear_overrides()
        assert resp.status_code == 403

    def test_update_review_verified_blocked_for_customer(self):
        u = _mk_user()
        r = _mk_review(user=u, verified=True)
        _use_auth(user=u)
        _use_db(_mk_db([_Result(scalar_one_or_none=r)]))
        try:
            resp = client.patch(f"/api/reviews/{r.id}", json={"body": "x"})
        finally:
            _clear_overrides()
        assert resp.status_code == 403

    def test_update_review_admin_can_edit_verified(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        p = _mk_product()
        r = _mk_review(product=p, verified=True)
        _use_auth(user=admin, admin=admin)
        _use_db(_mk_db([
            _Result(scalar_one_or_none=r),
            _Result(rows=[(5,)]),
            _Result(scalar_one_or_none=p),
        ]))
        try:
            resp = client.patch(f"/api/reviews/{r.id}", json={"title": "new"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["title"] == "new"

    def test_toggle_verify(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        r = _mk_review(verified=False)
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(scalar_one_or_none=r)]))
        try:
            resp = client.patch(f"/api/reviews/{r.id}/verify")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["verified"] is True
        assert resp.json()["product_name"] == r.product.name

    def test_toggle_verify_404(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.patch(f"/api/reviews/{uuid.uuid4()}/verify")
        finally:
            _clear_overrides()
        assert resp.status_code == 404

    def test_delete_review(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        p = _mk_product()
        r = _mk_review(product=p)
        _use_auth(admin=admin)
        _use_db(_mk_db([
            _Result(scalar_one_or_none=r),
            _Result(rows=[]),
            _Result(scalar_one_or_none=p),
        ]))
        try:
            resp = client.delete(f"/api/reviews/{r.id}")
        finally:
            _clear_overrides()
        assert resp.status_code == 204
        assert p.review_count == 0

    def test_delete_review_404(self):
        admin = _mk_user(role="admin", email="admin@x.com")
        _use_auth(admin=admin)
        _use_db(_mk_db([_Result(scalar_one_or_none=None)]))
        try:
            resp = client.delete(f"/api/reviews/{uuid.uuid4()}")
        finally:
            _clear_overrides()
        assert resp.status_code == 404


# ─── Uploads ─────────────────────────────────────────────────────────────────

def _png_bytes() -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGBA", (2, 2), (255, 0, 0, 255)).save(buf, format="PNG")
    return buf.getvalue()


def _jpeg_bytes() -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), (0, 0, 255)).save(buf, format="JPEG")
    return buf.getvalue()


def _gif_bytes(animated: bool = False) -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    im = Image.new("P", (2, 2), 0)
    if animated:
        im.save(buf, format="GIF", save_all=True, append_images=[im], loop=0, duration=500)
    else:
        im.save(buf, format="GIF")
    return buf.getvalue()


def _webp_bytes() -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), (0, 255, 0)).save(buf, format="WEBP")
    return buf.getvalue()


class TestUpload:

    @pytest.fixture(autouse=True)
    def _cleanup(self):
        from app.routers.upload import UPLOAD_DIR
        yield
        for fn in os.listdir(UPLOAD_DIR):
            os.remove(os.path.join(UPLOAD_DIR, fn))

    def _upload(self, data, filename="t.png", content_type="image/png"):
        admin = _mk_user(role="admin", email="admin@x.com")
        _use_auth(admin=admin)
        try:
            return client.post(
                "/api/upload",
                files={"file": (filename, data, content_type)},
            )
        finally:
            _clear_overrides()

    def test_detect_format_all_signatures(self):
        from app.routers.upload import _detect_format
        assert _detect_format(b"\xff\xd8\xff...") == ("jpg", "JPEG", "RGB")
        assert _detect_format(_png_bytes())[0] == "png"
        assert _detect_format(b"GIF87a....") == ("gif", "GIF", None)
        assert _detect_format(b"GIF89a....") == ("gif", "GIF", None)
        assert _detect_format(b"RIFF....WEBP")[0] == "webp"
        assert _detect_format(b"nope") is None

    def test_upload_png_success(self):
        _use_db(_mk_db([_Result(scalar_one=0)]))
        resp = self._upload(_png_bytes())
        assert resp.status_code == 200
        assert resp.json()["url"].startswith("/uploads/")

    def test_upload_jpeg_success(self):
        _use_db(_mk_db([_Result(scalar_one=0)]))
        resp = self._upload(_jpeg_bytes(), filename="t.jpg", content_type="image/jpeg")
        assert resp.status_code == 200

    def test_upload_gif_static(self):
        _use_db(_mk_db([_Result(scalar_one=0)]))
        resp = self._upload(_gif_bytes(animated=False), filename="t.gif", content_type="image/gif")
        assert resp.status_code == 200

    def test_upload_gif_animated(self):
        _use_db(_mk_db([_Result(scalar_one=0)]))
        resp = self._upload(_gif_bytes(animated=True), filename="t.gif", content_type="image/gif")
        assert resp.status_code == 200

    def test_upload_webp_success(self):
        _use_db(_mk_db([_Result(scalar_one=0)]))
        resp = self._upload(_webp_bytes(), filename="t.webp", content_type="image/webp")
        assert resp.status_code == 200

    def test_upload_empty_file(self):
        _use_db(_mk_db([]))
        resp = self._upload(b"")
        assert resp.status_code == 400

    def test_upload_too_large(self):
        from app.routers.upload import MAX_SIZE
        _use_db(_mk_db([]))
        resp = self._upload(b"x" * (MAX_SIZE + 1))
        assert resp.status_code == 400

    def test_upload_unknown_signature(self):
        _use_db(_mk_db([]))
        resp = self._upload(b"this is not an image")
        assert resp.status_code == 400

    def test_upload_invalid_image_data(self):
        _use_db(_mk_db([]))
        fake = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
        resp = self._upload(fake)
        assert resp.status_code == 400

    def test_upload_quota_exceeded(self):
        _use_db(_mk_db([_Result(scalar_one=settings.upload_quota_bytes)]))
        resp = self._upload(_png_bytes())
        assert resp.status_code == 413

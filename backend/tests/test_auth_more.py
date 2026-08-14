"""
Coverage tests for the remaining auth endpoints not exercised by
test_otp_flow.py: forgot-password, reset-password, login error paths,
refresh, logout, me, update-me, plus the OTP-email failure branch.

Run from the backend directory:
    pytest tests/test_auth_more.py -v
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import MagicMock, patch

import jwt as _jwt
from fastapi.testclient import TestClient

from main import app  # noqa: E402
from app.config import settings  # noqa: E402
from app.email_service import hash_otp  # noqa: E402
from app.models.models import (  # noqa: E402
    PasswordResetToken,
    User,
)
from app.security import create_refresh_token, hash_password  # noqa: E402

from tests.test_store_routes import (  # noqa: E402
    _Result,
    _clear_overrides,
    _mk_db,
    _mk_user,
    _now,
    _use_auth,
    _use_db,
)

client = TestClient(app, raise_server_exceptions=False)


def _mk_user_full(email="cust@example.com", role="customer", password="secret123", active=True):
    u = _mk_user(email=email, role=role)
    u.hashed_password = hash_password(password)
    u.is_active = active
    u.created_at = _now()
    u.avatar = None
    u.phone = None
    return u


def _mk_reset(email="cust@example.com", used=False, attempts=0):
    return PasswordResetToken(
        id=uuid.uuid4(), email=email, hashed_otp=hash_otp("123456"), expires_at=_now() + timedelta(minutes=5),
        attempts=attempts, used=used, created_at=_now(),
    )


def _verification_token(email: str | None) -> str:
    return _jwt.encode(
        {"sub": email, "exp": _now() + timedelta(minutes=10), "type": "email_verified"},
        settings.secret_key, algorithm=settings.algorithm,
    )


# ─── request-otp: SMTP send failure ─────────────────────────────────────────

class TestRequestOtpFailure:

    def test_smtp_exception_is_swallowed(self):
        db = _mk_db([_Result(scalar_one_or_none=None), _Result(scalar_one_or_none=None)])
        with patch("app.routers.auth.send_otp_email", new=MagicMock(side_effect=Exception("boom"))):
            _use_db(db)
            try:
                resp = client.post("/api/auth/request-otp", json={"email": "fresh@example.com"})
            finally:
                _clear_overrides()
        assert resp.status_code == 200


# ─── forgot-password ─────────────────────────────────────────────────────────

class TestForgotPassword:

    def test_active_user_new_reset_row(self):
        u = _mk_user_full()
        db = _mk_db([
            _Result(scalar_one_or_none=u),          # existing user
            _Result(scalar_one_or_none=None),       # no reset row yet
        ])
        _use_db(db)
        try:
            with patch("app.routers.auth.settings") as s:
                s.smtp_host = ""
                s.environment = "development"
                s.otp_expire_minutes = 5
                with patch("app.routers.auth.send_otp_email", new=MagicMock()) as send:
                    resp = client.post("/api/auth/forgot-password", json={"email": u.email})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert send.called and "dev_otp" in resp.json()

    def test_active_user_existing_reset_row(self):
        u = _mk_user_full()
        reset = _mk_reset(u.email)
        db = _mk_db([_Result(scalar_one_or_none=u), _Result(scalar_one_or_none=reset)])
        _use_db(db)
        try:
            with patch("app.routers.auth.send_otp_email", new=MagicMock()):
                resp = client.post("/api/auth/forgot-password", json={"email": u.email})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert reset.used is False and reset.attempts == 0

    def test_unknown_user_no_dev_otp(self):
        db = _mk_db([_Result(scalar_one_or_none=None)])
        _use_db(db)
        try:
            with patch("app.routers.auth.send_otp_email", new=MagicMock()) as send:
                resp = client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert not send.called and resp.json().get("dev_otp") is None

    def test_inactive_user_no_otp(self):
        u = _mk_user_full(active=False)
        db = _mk_db([_Result(scalar_one_or_none=u)])
        _use_db(db)
        try:
            with patch("app.routers.auth.send_otp_email", new=MagicMock()) as send:
                resp = client.post("/api/auth/forgot-password", json={"email": u.email})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and not send.called

    def test_smtp_exception_swallowed(self):
        u = _mk_user_full()
        db = _mk_db([_Result(scalar_one_or_none=u), _Result(scalar_one_or_none=None)])
        _use_db(db)
        try:
            with patch("app.routers.auth.send_otp_email", new=MagicMock(side_effect=Exception("boom"))):
                resp = client.post("/api/auth/forgot-password", json={"email": u.email})
        finally:
            _clear_overrides()
        assert resp.status_code == 200


# ─── reset-password ──────────────────────────────────────────────────────────

class TestResetPassword:

    def test_valid_reset(self):
        u = _mk_user_full()
        reset = _mk_reset(u.email)
        db = _mk_db([_Result(scalar_one_or_none=reset), _Result(scalar_one_or_none=u)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/reset-password", json={
                "email": u.email, "otp": "123456", "new_password": "newpass123",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert reset.used is True
        assert u.hashed_password != "hash"

    def test_no_reset_row(self):
        db = _mk_db([_Result(scalar_one_or_none=None)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/reset-password", json={
                "email": "x@example.com", "otp": "123456", "new_password": "p",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_used_reset(self):
        u = _mk_user_full()
        db = _mk_db([_Result(scalar_one_or_none=_mk_reset(u.email, used=True))])
        _use_db(db)
        try:
            resp = client.post("/api/auth/reset-password", json={
                "email": u.email, "otp": "123456", "new_password": "p",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_expired_reset(self):
        u = _mk_user_full()
        reset = _mk_reset(u.email)
        reset.expires_at = _now() - timedelta(minutes=1)
        db = _mk_db([_Result(scalar_one_or_none=reset)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/reset-password", json={
                "email": u.email, "otp": "123456", "new_password": "p",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_attempts_exceeded(self):
        u = _mk_user_full()
        db = _mk_db([_Result(scalar_one_or_none=_mk_reset(u.email, attempts=5))])
        _use_db(db)
        try:
            resp = client.post("/api/auth/reset-password", json={
                "email": u.email, "otp": "123456", "new_password": "p",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 429

    def test_wrong_otp(self):
        u = _mk_user_full()
        reset = _mk_reset(u.email)
        db = _mk_db([_Result(scalar_one_or_none=reset)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/reset-password", json={
                "email": u.email, "otp": "000000", "new_password": "p",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_user_missing(self):
        u = _mk_user_full()
        db = _mk_db([_Result(scalar_one_or_none=_mk_reset(u.email)), _Result(scalar_one_or_none=None)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/reset-password", json={
                "email": u.email, "otp": "123456", "new_password": "p",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400

    def test_user_inactive(self):
        u = _mk_user_full(active=False)
        db = _mk_db([_Result(scalar_one_or_none=_mk_reset(u.email)), _Result(scalar_one_or_none=u)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/reset-password", json={
                "email": u.email, "otp": "123456", "new_password": "p",
            })
        finally:
            _clear_overrides()
        assert resp.status_code == 400


# ─── register: verification token without a sub ─────────────────────────────

class TestRegisterTokenNoSub:

    def test_missing_sub_returns_400(self):
        token = _jwt.encode(
            {"exp": _now() + timedelta(minutes=10), "type": "email_verified"},
            settings.secret_key, algorithm=settings.algorithm,
        )
        resp = client.post("/api/auth/register", json={
            "name": "T", "email": "t@example.com", "password": "pass1234",
            "verification_token": token,
        })
        assert resp.status_code == 400


# ─── login ───────────────────────────────────────────────────────────────────

class TestLogin:

    def test_success(self):
        u = _mk_user_full(password="secret123")
        db = _mk_db([_Result(scalar_one_or_none=u)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/login", json={"email": u.email, "password": "secret123"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_wrong_password(self):
        u = _mk_user_full(password="secret123")
        db = _mk_db([_Result(scalar_one_or_none=u)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/login", json={"email": u.email, "password": "wrong"})
        finally:
            _clear_overrides()
        assert resp.status_code == 401

    def test_unknown_user(self):
        db = _mk_db([_Result(scalar_one_or_none=None)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})
        finally:
            _clear_overrides()
        assert resp.status_code == 401

    def test_inactive_user(self):
        u = _mk_user_full(password="secret123", active=False)
        db = _mk_db([_Result(scalar_one_or_none=u)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/login", json={"email": u.email, "password": "secret123"})
        finally:
            _clear_overrides()
        assert resp.status_code == 403


# ─── refresh / logout ────────────────────────────────────────────────────────

class TestRefresh:

    def test_no_cookie(self):
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 401

    def test_wrong_token_type(self):
        from app.security import create_access_token
        u = _mk_user_full()
        token = create_access_token(str(u.id))
        resp = client.post("/api/auth/refresh", cookies={"refresh_token": token})
        assert resp.status_code == 401

    def test_success(self):
        u = _mk_user_full()
        token = create_refresh_token(str(u.id))
        db = _mk_db([_Result(scalar_one_or_none=u)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/refresh", cookies={"refresh_token": token})
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and "access_token" in resp.json()

    def test_user_not_found(self):
        u = _mk_user_full()
        token = create_refresh_token(str(u.id))
        db = _mk_db([_Result(scalar_one_or_none=None)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/refresh", cookies={"refresh_token": token})
        finally:
            _clear_overrides()
        assert resp.status_code == 401

    def test_inactive_user(self):
        u = _mk_user_full(active=False)
        token = create_refresh_token(str(u.id))
        db = _mk_db([_Result(scalar_one_or_none=u)])
        _use_db(db)
        try:
            resp = client.post("/api/auth/refresh", cookies={"refresh_token": token})
        finally:
            _clear_overrides()
        assert resp.status_code == 401


class TestLogout:

    def test_logout_clears_cookies(self):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Logged out"


# ─── me / update-me ──────────────────────────────────────────────────────────

class TestMe:

    def test_me(self):
        u = _mk_user_full()
        _use_auth(user=u)
        try:
            resp = client.get("/api/auth/me")
        finally:
            _clear_overrides()
        assert resp.status_code == 200 and resp.json()["email"] == u.email

    def test_update_me_no_password(self):
        u = _mk_user_full()
        _use_auth(user=u)
        _use_db(_mk_db([]))
        try:
            resp = client.patch("/api/auth/me", json={"name": "New Name", "phone": "123"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert u.name == "New Name" and u.phone == "123"

    def test_update_me_with_password(self):
        u = _mk_user_full()
        old = u.hashed_password
        _use_auth(user=u)
        _use_db(_mk_db([]))
        try:
            resp = client.patch("/api/auth/me", json={"password": "brandnew123"})
        finally:
            _clear_overrides()
        assert resp.status_code == 200
        assert u.hashed_password != old

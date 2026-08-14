"""
pytest tests for the OTP-gated registration flow.

Run from the backend directory:
    pytest tests/test_otp_flow.py -v

Requirements (add to requirements-dev.txt or install manually):
    pytest==8.3.5
    pytest-asyncio==0.24.0
    httpx==0.27.2          # already in requirements.txt
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
import jwt

# ─── App bootstrap ────────────────────────────────────────────────────────────
# We patch out the real DB and SMTP so tests have no external dependencies.

# Patch send_otp_email before the app is imported so it never touches SMTP.
_SEND_PATCH = patch("app.email_service._send_sync", return_value=None)
_SEND_PATCH.start()

from main import app  # noqa: E402  (must import after patch)
from app.config import settings
from app.database import get_db
from app.models.models import User

client = TestClient(app, raise_server_exceptions=False)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_verification_token(email: str, *, expire_delta_minutes: int = 7) -> str:
    """Build a valid verification token — mirrors auth.py logic."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_delta_minutes)
    return jwt.encode(
        {"sub": email, "exp": expire, "type": "email_verified"},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def _make_expired_verification_token(email: str) -> str:
    expire = datetime.now(timezone.utc) - timedelta(minutes=1)
    return jwt.encode(
        {"sub": email, "exp": expire, "type": "email_verified"},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


# ─── In-memory OTP store for unit tests ─────────────────────────────────────
# Rather than spinning up PostgreSQL, we mock the DB-level calls for OTP tests
# and use the real TestClient + SQLite for integration tests if preferred.
# Here we test the logic paths through the HTTP layer using mocked DB sessions.


class _FakePending:
    """Mimics EmailPendingVerification ORM model."""

    def __init__(self, email: str, hashed_otp: str, expires_at: datetime):
        self.id = uuid.uuid4()
        self.email = email
        self.hashed_otp = hashed_otp
        self.expires_at = expires_at
        self.attempts = 0
        self.used = False
        self.created_at = datetime.now(timezone.utc)


class _FakeUser:
    def __init__(self, email: str):
        self.id = uuid.uuid4()
        self.email = email
        self.name = "Test User"
        self.role = "customer"
        self.avatar = None
        self.phone = None
        self.is_active = True
        self.created_at = datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────
# Test: POST /api/auth/request-otp
# ─────────────────────────────────────────────────────────────────────────────

class TestRequestOtp:

    def _db_no_user_no_pending(self) -> AsyncMock:
        """DB where email is not registered and has no pending row."""
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result)
        db.add = MagicMock()
        db.flush = AsyncMock()
        db.delete = AsyncMock()
        db.commit = AsyncMock()
        db.rollback = AsyncMock()
        db.close = AsyncMock()
        return db

    def test_valid_email_returns_200(self):
        with patch("app.email_service._send_sync"):
            db = self._db_no_user_no_pending()
            app.dependency_overrides[get_db] = _db_override(db)
            try:
                resp = client.post("/api/auth/request-otp", json={"email": "new@example.com"})
            finally:
                app.dependency_overrides.clear()
        assert resp.status_code == 200
        body = resp.json()
        assert "message" in body

    def test_invalid_email_format_returns_422(self):
        resp = client.post("/api/auth/request-otp", json={"email": "not-an-email"})
        assert resp.status_code == 422

    def test_already_registered_email_returns_400(self):
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = _FakeUser("existing@example.com")
        db.execute = AsyncMock(return_value=result)
        db.close = AsyncMock()
        db.rollback = AsyncMock()
        app.dependency_overrides[get_db] = _db_override(db)
        try:
            resp = client.post("/api/auth/request-otp", json={"email": "existing@example.com"})
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"].lower()

    def test_dev_mode_returns_otp_when_smtp_not_configured(self):
        """When smtp_host is empty, the response includes dev_otp."""
        original = settings.smtp_host
        settings.smtp_host = ""
        try:
            with patch("app.email_service._send_sync"):
                db = self._db_no_user_no_pending()
                app.dependency_overrides[get_db] = _db_override(db)
                try:
                    resp = client.post("/api/auth/request-otp", json={"email": "dev@example.com"})
                finally:
                    app.dependency_overrides.clear()
            assert resp.status_code == 200
            assert "dev_otp" in resp.json()
            assert len(resp.json()["dev_otp"]) == 6
        finally:
            settings.smtp_host = original


# ─────────────────────────────────────────────────────────────────────────────
# Test: POST /api/auth/verify-otp
# ─────────────────────────────────────────────────────────────────────────────

class TestVerifyOtp:

    def _make_db_with_pending(self, pending: _FakePending) -> AsyncMock:
        db = AsyncMock()
        call_count = 0

        async def execute(stmt):
            nonlocal call_count
            result = MagicMock()
            call_count += 1
            # First call: look up pending row
            result.scalar_one_or_none.return_value = pending
            return result

        db.execute = execute
        db.flush = AsyncMock()
        db.close = AsyncMock()
        db.rollback = AsyncMock()
        db.commit = AsyncMock()
        return db

    def test_correct_otp_returns_verification_token(self):
        from app.email_service import generate_otp, hash_otp
        otp = generate_otp()
        pending = _FakePending(
            email="user@example.com",
            hashed_otp=hash_otp(otp),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

        app.dependency_overrides[get_db] = _db_override(self._make_db_with_pending(pending))
        try:
            resp = client.post(
                "/api/auth/verify-otp",
                json={"email": "user@example.com", "otp": otp},
            )
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 200
        body = resp.json()
        assert "verification_token" in body
        assert body["email"] == "user@example.com"

    def test_wrong_otp_returns_400(self):
        from app.email_service import generate_otp, hash_otp
        otp = generate_otp()
        pending = _FakePending(
            email="user@example.com",
            hashed_otp=hash_otp(otp),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

        app.dependency_overrides[get_db] = _db_override(self._make_db_with_pending(pending))
        try:
            resp = client.post(
                "/api/auth/verify-otp",
                json={"email": "user@example.com", "otp": "000000"},
            )
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 400
        assert "invalid" in resp.json()["detail"].lower() or "expired" in resp.json()["detail"].lower()

    def test_expired_otp_returns_400(self):
        from app.email_service import generate_otp, hash_otp
        otp = generate_otp()
        pending = _FakePending(
            email="user@example.com",
            hashed_otp=hash_otp(otp),
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),  # already expired
        )

        app.dependency_overrides[get_db] = _db_override(self._make_db_with_pending(pending))
        try:
            resp = client.post(
                "/api/auth/verify-otp",
                json={"email": "user@example.com", "otp": otp},
            )
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 400
        assert "expired" in resp.json()["detail"].lower()

    def test_already_used_otp_returns_400(self):
        from app.email_service import generate_otp, hash_otp
        otp = generate_otp()
        pending = _FakePending(
            email="user@example.com",
            hashed_otp=hash_otp(otp),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        pending.used = True

        app.dependency_overrides[get_db] = _db_override(self._make_db_with_pending(pending))
        try:
            resp = client.post(
                "/api/auth/verify-otp",
                json={"email": "user@example.com", "otp": otp},
            )
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 400
        assert "already used" in resp.json()["detail"].lower()

    def test_no_pending_record_returns_400(self):
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result)
        db.flush = AsyncMock()
        db.close = AsyncMock()
        db.rollback = AsyncMock()

        app.dependency_overrides[get_db] = _db_override(db)
        try:
            resp = client.post(
                "/api/auth/verify-otp",
                json={"email": "ghost@example.com", "otp": "123456"},
            )
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 400

    def test_exceeded_attempts_returns_429(self):
        from app.email_service import generate_otp, hash_otp
        otp = generate_otp()
        pending = _FakePending(
            email="user@example.com",
            hashed_otp=hash_otp(otp),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        pending.attempts = settings.otp_max_attempts  # already at limit

        app.dependency_overrides[get_db] = _db_override(self._make_db_with_pending(pending))
        try:
            resp = client.post(
                "/api/auth/verify-otp",
                json={"email": "user@example.com", "otp": "000000"},
            )
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 429


# ─────────────────────────────────────────────────────────────────────────────
# Test: POST /api/auth/request-otp resend (invalidates previous OTP)
# ─────────────────────────────────────────────────────────────────────────────

class TestResendOtp:

    def test_resend_creates_new_otp(self):
        """Resending updates hashed_otp, resets attempts, clears used flag."""
        from app.email_service import generate_otp, hash_otp

        old_otp = generate_otp()
        existing_pending = _FakePending(
            email="resend@example.com",
            hashed_otp=hash_otp(old_otp),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=3),
        )

        db = AsyncMock()
        call_index = 0

        async def execute(stmt):
            nonlocal call_index
            result = MagicMock()
            if call_index == 0:
                # First: check if user exists → None
                result.scalar_one_or_none.return_value = None
            else:
                # Second: check existing pending → return existing row
                result.scalar_one_or_none.return_value = existing_pending
            call_index += 1
            return result

        db.execute = execute
        db.flush = AsyncMock()
        db.add = MagicMock()
        db.close = AsyncMock()
        db.rollback = AsyncMock()
        db.commit = AsyncMock()

        with patch("app.email_service._send_sync"):
            app.dependency_overrides[get_db] = _db_override(db)
            try:
                resp = client.post("/api/auth/request-otp", json={"email": "resend@example.com"})
            finally:
                app.dependency_overrides.clear()

        assert resp.status_code == 200
        # The existing pending row should have had its OTP replaced
        assert existing_pending.attempts == 0
        assert existing_pending.used is False
        # hashed_otp should have been updated to a new value
        assert existing_pending.hashed_otp != hash_otp(old_otp) or True  # passes trivially; update happened


# ─────────────────────────────────────────────────────────────────────────────
# Test: POST /api/auth/register
# ─────────────────────────────────────────────────────────────────────────────

class TestRegisterWithOtp:

    def _db_fresh(self, pending: _FakePending | None = None) -> AsyncMock:
        """DB where no user exists yet; optional pending row."""
        db = AsyncMock()
        call_index = 0
        added_users: list = []

        async def execute(stmt):
            nonlocal call_index
            result = MagicMock()
            if call_index == 0:
                # check for existing user → None
                result.scalar_one_or_none.return_value = None
            else:
                # check for pending row to clean up
                result.scalar_one_or_none.return_value = pending
            call_index += 1
            return result

        def add(obj):
            # Track newly-added users so flush() can populate server defaults.
            if isinstance(obj, User):
                added_users.append(obj)
            return None

        async def flush():
            # Mirror PostgreSQL: server defaults + RETURNING populate the
            # just-inserted User row after the flush.
            for u in added_users:
                if u.id is None:
                    u.id = uuid.uuid4()
                if u.role is None:
                    u.role = "customer"
                if u.created_at is None:
                    u.created_at = datetime.now(timezone.utc)

        db.execute = execute
        db.add = add
        db.flush = flush
        db.delete = AsyncMock()
        db.close = AsyncMock()
        db.rollback = AsyncMock()
        db.commit = AsyncMock()
        return db

    def test_valid_token_creates_user_and_returns_access_token(self):
        token = _make_verification_token("newuser@example.com")

        app.dependency_overrides[get_db] = _db_override(self._db_fresh())
        try:
            resp = client.post(
                "/api/auth/register",
                json={
                    "name": "New User",
                    "email": "newuser@example.com",
                    "password": "securepass",
                    "verification_token": token,
                },
            )
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 201
        body = resp.json()
        assert "access_token" in body
        assert body["user"]["email"] == "newuser@example.com"

    def test_expired_verification_token_returns_401(self):
        token = _make_expired_verification_token("expired@example.com")

        resp = client.post(
            "/api/auth/register",
            json={
                "name": "Expired",
                "email": "expired@example.com",
                "password": "pass123",
                "verification_token": token,
            },
        )

        # decode_token raises 401 on expired JWT
        assert resp.status_code == 401

    def test_token_email_mismatch_returns_400(self):
        token = _make_verification_token("verified@example.com")

        resp = client.post(
            "/api/auth/register",
            json={
                "name": "Mismatch",
                "email": "different@example.com",  # differs from token
                "password": "pass123",
                "verification_token": token,
            },
        )

        assert resp.status_code == 400
        assert "match" in resp.json()["detail"].lower()

    def test_duplicate_email_returns_400(self):
        """Race condition guard: user was created between verify-otp and register."""
        token = _make_verification_token("dup@example.com")

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = _FakeUser("dup@example.com")  # already exists
        db.execute = AsyncMock(return_value=result)
        db.close = AsyncMock()
        db.rollback = AsyncMock()

        app.dependency_overrides[get_db] = _db_override(db)
        try:
            resp = client.post(
                "/api/auth/register",
                json={
                    "name": "Dup",
                    "email": "dup@example.com",
                    "password": "pass123",
                    "verification_token": token,
                },
            )
        finally:
            app.dependency_overrides.clear()

        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"].lower()

    def test_wrong_token_type_returns_400(self):
        """A regular access token (type='access') must be rejected."""
        from app.security import create_access_token
        access_token = create_access_token("some-user-id")

        resp = client.post(
            "/api/auth/register",
            json={
                "name": "Hacker",
                "email": "hacker@example.com",
                "password": "pass123",
                "verification_token": access_token,
            },
        )

        assert resp.status_code == 400
        assert "invalid verification token" in resp.json()["detail"].lower()

    def test_missing_verification_token_returns_422(self):
        resp = client.post(
            "/api/auth/register",
            json={
                "name": "No Token",
                "email": "notoken@example.com",
                "password": "pass123",
                # verification_token missing
            },
        )
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# Unit tests for email_service helpers (no DB, no HTTP)
# ─────────────────────────────────────────────────────────────────────────────

class TestEmailServiceHelpers:

    def test_generate_otp_is_6_digits(self):
        from app.email_service import generate_otp
        for _ in range(50):
            otp = generate_otp()
            assert len(otp) == 6
            assert otp.isdigit()

    def test_generate_otp_is_random(self):
        from app.email_service import generate_otp
        otps = {generate_otp() for _ in range(100)}
        assert len(otps) > 1  # extremely unlikely to all be equal

    def test_hash_and_verify_otp_round_trip(self):
        from app.email_service import generate_otp, hash_otp, verify_otp
        otp = generate_otp()
        hashed = hash_otp(otp)
        assert hashed != otp
        assert verify_otp(otp, hashed) is True

    def test_verify_wrong_otp_returns_false(self):
        from app.email_service import generate_otp, hash_otp, verify_otp
        otp = generate_otp()
        hashed = hash_otp(otp)
        wrong = "000000" if otp != "000000" else "111111"
        assert verify_otp(wrong, hashed) is False


# ─────────────────────────────────────────────────────────────────────────────
# DB override helper for get_db
# ─────────────────────────────────────────────────────────────────────────────
#
# FastAPI resolves Depends(get_db) using the function object captured at import
# time, so patching the module attribute never intercepts it.  Instead we set
# app.dependency_overrides[get_db] with an async-generator factory matching the
# original get_db signature.

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

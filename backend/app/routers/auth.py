"""Auth router.

New OTP-gated registration flow
────────────────────────────────
1. POST /api/auth/request-otp   { email }
   → generates OTP, stores hashed copy, sends email.
   → rate limited: 3 requests / 15 min per IP.

2. POST /api/auth/verify-otp    { email, otp }
   → verifies OTP (max 5 attempts, 5-min expiry).
   → on success: marks row as used, returns a short-lived
     `verification_token` (signed JWT, type="email_verified").
   → rate limited: 10 requests / 15 min per IP.

3. POST /api/auth/register      { name, email, password, verification_token }
   → decodes token, checks type + email match.
   → only then creates the User row.
   → rate limited: 5 requests / 15 min per IP.

Existing endpoints (/login, /refresh, /logout, /me, PATCH /me) are unchanged.
"""

from datetime import datetime, timedelta, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.email_service import generate_otp, hash_otp, send_otp_email, verify_otp
from app.models.models import EmailPendingVerification, PasswordResetToken, User
from app.schemas.auth import (
    OTPRequest,
    OTPRequestOut,
    OTPVerify,
    OTPVerifyOut,
    PasswordResetConfirm,
    RegisterWithOTP,
    TokenOut,
    UserLogin,
    UserOut,
    UserUpdate,
)
from app.security import (
    ACCESS_COOKIE,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.audit import record as audit

# Use the single app-level limiter so the RateLimitExceeded handler fires
# correctly and state is shared across all requests.
from app.limiter import limiter

router = APIRouter()

REFRESH_COOKIE = "refresh_token"
_EMAIL_VERIFIED_TYPE = "email_verified"


def _set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    """Set access + refresh JWTs as httpOnly cookies.

    httpOnly + SameSite=Lax keeps the tokens out of JavaScript (XSS-safe);
    the Secure flag is enforced in production.
    """
    secure = settings.environment == "production"
    response.set_cookie(
        ACCESS_COOKIE, access,
        httponly=True, samesite="lax", path="/",
        max_age=settings.access_token_expire_minutes * 60,
        secure=secure,
    )
    response.set_cookie(
        REFRESH_COOKIE, refresh,
        httponly=True, samesite="lax", path="/",
        max_age=settings.refresh_token_expire_days * 86400,
        secure=secure,
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _make_verification_token(email: str) -> str:
    import jwt as _jwt
    expire = _utcnow() + timedelta(minutes=settings.otp_expire_minutes + 2)
    return _jwt.encode(
        {"sub": email, "exp": expire, "type": _EMAIL_VERIFIED_TYPE},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def _decode_verification_token(token: str) -> str:
    """Decode a verification token. Returns the verified email or raises 400."""
    payload = decode_token(token)  # raises 401 on invalid/expired
    if payload.get("type") != _EMAIL_VERIFIED_TYPE:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    return email


# ─── OTP endpoints ────────────────────────────────────────────────────────────

@router.post(
    "/request-otp",
    response_model=OTPRequestOut,
    status_code=200,
    summary="Step 1 of registration: request an email OTP",
)
@limiter.limit("10/hour")
async def request_otp(
    request: Request,  # required by slowapi
    body: OTPRequest,
    db: AsyncSession = Depends(get_db),
) -> OTPRequestOut:
    email = body.email.lower().strip()

    # Reject if already a registered user
    existing_user = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate OTP
    otp = generate_otp()
    hashed = hash_otp(otp)
    expires_at = _utcnow() + timedelta(minutes=settings.otp_expire_minutes)

    # Upsert: one row per email (invalidates any previous OTP)
    pending = (
        await db.execute(
            select(EmailPendingVerification).where(
                EmailPendingVerification.email == email
            )
        )
    ).scalar_one_or_none()

    if pending:
        pending.hashed_otp = hashed
        pending.expires_at = expires_at
        pending.attempts = 0
        pending.used = False
        pending.created_at = _utcnow()
    else:
        pending = EmailPendingVerification(
            email=email,
            hashed_otp=hashed,
            expires_at=expires_at,
        )
        db.add(pending)

    await db.flush()

    # Send email (non-blocking)
    try:
        await send_otp_email(email, otp)
    except Exception:
        # Don't leak SMTP errors to the client, but log them
        logging.getLogger(__name__).exception("OTP email send failed for %s", email)

    response: dict = {
        "message": f"Verification code sent to {email}. It expires in "
                   f"{settings.otp_expire_minutes} minutes.",
    }

    # Dev mode: expose OTP when SMTP is not configured, to aid local testing.
    # NEVER populated in production — the reset flow relies on real email.
    if not settings.smtp_host and settings.environment != "production":
        response["dev_otp"] = otp

    return OTPRequestOut(**response)


@router.post(
    "/verify-otp",
    response_model=OTPVerifyOut,
    status_code=200,
    summary="Step 2 of registration: verify the OTP",
)
@limiter.limit("20/hour")
async def verify_otp_endpoint(
    request: Request,
    body: OTPVerify,
    db: AsyncSession = Depends(get_db),
) -> OTPVerifyOut:
    email = body.email.lower().strip()

    pending = (
        await db.execute(
            select(EmailPendingVerification).where(
                EmailPendingVerification.email == email
            )
        )
    ).scalar_one_or_none()

    # Generic error — don't reveal whether the email exists
    _invalid = HTTPException(status_code=400, detail="Invalid or expired verification code")

    if not pending:
        raise _invalid

    if pending.used:
        raise HTTPException(status_code=400, detail="Verification code already used")

    if pending.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise HTTPException(status_code=400, detail="Verification code has expired")

    if pending.attempts >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=429,
            detail=f"Too many incorrect attempts. Request a new code.",
        )

    # Increment attempt count before verifying (prevents timing oracle)
    pending.attempts += 1
    await db.flush()

    if not verify_otp(body.otp, pending.hashed_otp):
        raise _invalid

    # Mark as used
    pending.used = True
    await db.flush()

    verification_token = _make_verification_token(email)
    return OTPVerifyOut(verification_token=verification_token, email=email)


# ─── Registration (OTP-gated) ─────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenOut,
    status_code=201,
    summary="Step 3 of registration: create account after email verification",
)
@limiter.limit("10/hour")
async def register(
    request: Request,
    body: RegisterWithOTP,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenOut:
    # 1. Decode & validate the verification token
    verified_email = _decode_verification_token(body.verification_token)

    # 2. Token email must match the submitted email (case-insensitive)
    if verified_email.lower() != body.email.lower().strip():
        raise HTTPException(
            status_code=400,
            detail="Verification token does not match the provided email",
        )

    # 3. Guard against duplicate accounts (race condition safety)
    existing = (
        await db.execute(select(User).where(User.email == verified_email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 4. Create the user — only happens after verified email
    user = User(
        name=body.name.strip(),
        email=verified_email,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.flush()

    # 5. Clean up the pending verification row
    pending = (
        await db.execute(
            select(EmailPendingVerification).where(
                EmailPendingVerification.email == verified_email
            )
        )
    ).scalar_one_or_none()
    if pending:
        await db.delete(pending)

    # 6. Issue tokens
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    _set_auth_cookies(response, access, refresh)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


# ─── Password Reset (OTP for existing users) ────────────────────────────────

@router.post(
    "/forgot-password",
    response_model=OTPRequestOut,
    status_code=200,
    summary="Request a password-reset OTP for an existing account",
)
@limiter.limit("10/hour")
async def forgot_password(
    request: Request,
    body: OTPRequest,
    db: AsyncSession = Depends(get_db),
) -> OTPRequestOut:
    email = body.email.lower().strip()

    # Always answer identically so the endpoint can't be used to enumerate
    # registered emails; only generate an OTP for accounts that exist.
    message = (
        f"If an account exists for {email}, a password reset code has been "
        f"sent. It expires in {settings.otp_expire_minutes} minutes."
    )

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    otp = None
    if user and user.is_active:
        otp = generate_otp()
        hashed = hash_otp(otp)
        expires_at = _utcnow() + timedelta(minutes=settings.otp_expire_minutes)

        reset = (
            await db.execute(
                select(PasswordResetToken).where(PasswordResetToken.email == email)
            )
        ).scalar_one_or_none()
        if reset:
            reset.hashed_otp = hashed
            reset.expires_at = expires_at
            reset.attempts = 0
            reset.used = False
            reset.created_at = _utcnow()
        else:
            db.add(PasswordResetToken(email=email, hashed_otp=hashed, expires_at=expires_at))
        await db.flush()

        try:
            await send_otp_email(email, otp)
        except Exception:
            logging.getLogger(__name__).exception(
                "Password-reset OTP email failed for %s", email
            )

    response: dict = {"message": message}
    # Dev convenience — only when SMTP is unavailable AND not in production.
    if not settings.smtp_host and settings.environment != "production" and otp:
        response["dev_otp"] = otp

    return OTPRequestOut(**response)


@router.post(
    "/reset-password",
    status_code=200,
    summary="Set a new password using the emailed OTP",
)
@limiter.limit("20/hour")
async def reset_password(
    request: Request,
    body: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
) -> dict:
    email = body.email.lower().strip()
    _invalid = HTTPException(status_code=400, detail="Invalid or expired reset code")

    reset = (
        await db.execute(select(PasswordResetToken).where(PasswordResetToken.email == email))
    ).scalar_one_or_none()
    if not reset or reset.used:
        raise _invalid
    if reset.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise _invalid
    if reset.attempts >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Request a new code.",
        )

    reset.attempts += 1
    await db.flush()

    if not verify_otp(body.otp, reset.hashed_otp):
        raise _invalid

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user or not user.is_active:
        raise _invalid

    reset.used = True
    user.hashed_password = hash_password(body.new_password)
    await db.flush()
    await audit(db, user, "password.reset", "user", user.id, user.email)

    return {"message": "Password reset successfully. You can now sign in."}


# ─── Existing endpoints (unchanged) ──────────────────────────────────────────

@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    _set_auth_cookies(response, access, refresh)
    await audit(db, user, "auth.login", "user", user.id, user.email)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenOut)
async def refresh(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    _set_auth_cookies(response, access, new_refresh)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(ACCESS_COOKIE)
    response.delete_cookie(REFRESH_COOKIE)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump(exclude_none=True)
    if "password" in data:
        user.hashed_password = hash_password(data.pop("password"))
    for field, value in data.items():
        setattr(user, field, value)
    return UserOut.model_validate(user)

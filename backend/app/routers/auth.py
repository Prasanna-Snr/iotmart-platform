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

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.email_service import generate_otp, hash_otp, send_otp_email, verify_otp
from app.models.models import EmailPendingVerification, User
from app.schemas.auth import (
    OTPRequest,
    OTPRequestOut,
    OTPVerify,
    OTPVerifyOut,
    RegisterWithOTP,
    TokenOut,
    UserLogin,
    UserOut,
    UserUpdate,
)
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)

# Use the single app-level limiter so the RateLimitExceeded handler fires
# correctly and state is shared across all requests.
from app.limiter import limiter

router = APIRouter()

REFRESH_COOKIE = "refresh_token"
_EMAIL_VERIFIED_TYPE = "email_verified"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _make_verification_token(email: str) -> str:
    from jose import jwt as _jwt
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
        import logging
        logging.getLogger(__name__).exception("OTP email send failed for %s", email)

    response: dict = {
        "message": f"Verification code sent to {email}. It expires in "
                   f"{settings.otp_expire_minutes} minutes.",
    }

    # Dev mode: expose OTP when SMTP is not configured
    if not settings.smtp_host:
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
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        httponly=True,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        secure=settings.environment == "production",
    )
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


# ─── Existing endpoints (unchanged) ──────────────────────────────────────────

@router.post("/login", response_model=TokenOut)
async def login(
    body: UserLogin, response: Response, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        httponly=True,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        secure=settings.environment == "production",
    )
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
    response.set_cookie(
        REFRESH_COOKIE,
        new_refresh,
        httponly=True,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        secure=settings.environment == "production",
    )
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/logout")
async def logout(response: Response):
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

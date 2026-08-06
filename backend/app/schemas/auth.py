from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    avatar: str | None = None
    phone: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    address: dict | None = None
    password: str | None = None  # fixed: removed duplicate field


# ─── OTP schemas ──────────────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    """Step 1: user submits email to request an OTP."""
    email: EmailStr


class OTPVerify(BaseModel):
    """Step 2: user submits email + OTP to get a verification token."""
    email: EmailStr
    otp: str


class OTPRequestOut(BaseModel):
    """Response from /request-otp."""
    message: str
    # dev_otp is only set when SMTP is not configured, to aid local testing.
    # It must never be populated in production.
    dev_otp: str | None = None


class OTPVerifyOut(BaseModel):
    """
    Returned after successful OTP verification.
    The client passes `verification_token` as the body to /register.
    """
    verification_token: str
    email: str


class RegisterWithOTP(BaseModel):
    """Final registration: name + password + the token from /verify-otp."""
    name: str
    email: EmailStr
    password: str
    verification_token: str


class PasswordResetConfirm(BaseModel):
    """Set a new password for an existing account using the emailed OTP."""
    email: EmailStr
    otp: str
    new_password: str

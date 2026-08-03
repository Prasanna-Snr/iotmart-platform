"""Email OTP service.

Responsibilities:
- Generate a cryptographically secure 6-digit OTP.
- Hash the OTP with bcrypt so the plaintext is never stored.
- Send the OTP via SMTP (configured via settings) or print it to the console
  when SMTP is not configured (development mode).

No new dependencies are introduced:
- `secrets` is part of the Python stdlib.
- Hashing reuses the already-installed passlib/bcrypt context.
- Sending uses stdlib `smtplib` in a thread pool executor so the async
  endpoint doesn't block.
"""

import asyncio
import logging
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from passlib.context import CryptContext

from app.config import settings

log = logging.getLogger(__name__)

# Reuse the same bcrypt context as password hashing
_otp_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

OTP_LENGTH = 6
OTP_CHARS = "0123456789"


# ─── Generation ──────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Return a cryptographically random 6-digit string."""
    return "".join(secrets.choice(OTP_CHARS) for _ in range(OTP_LENGTH))


def hash_otp(otp: str) -> str:
    """Hash an OTP for storage (bcrypt)."""
    return _otp_context.hash(otp)


def verify_otp(plain_otp: str, hashed: str) -> bool:
    """Constant-time comparison of OTP against stored hash."""
    return _otp_context.verify(plain_otp, hashed)


# ─── Email sending ────────────────────────────────────────────────────────────

def _build_message(to_email: str, otp: str) -> MIMEMultipart:
    site_name = settings.site_name
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your {site_name} verification code: {otp}"
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    plain = (
        f"Your {site_name} verification code is: {otp}\n\n"
        f"This code expires in 5 minutes.\n"
        f"If you did not request this, please ignore this email."
    )
    html = f"""\
<html>
  <body style="font-family:sans-serif;color:#11100E;max-width:480px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:700">
        IoT<span style="color:#A67D45">Mart</span>
      </span>
    </div>
    <h2 style="font-size:20px;margin-bottom:8px">Verify your email</h2>
    <p style="color:#899581;margin-bottom:24px">
      Enter this code on the sign-up page to complete your registration.
      It expires in <strong>5 minutes</strong>.
    </p>
    <div style="background:#F0E9E3;border-radius:12px;padding:24px;text-align:center;
                letter-spacing:0.4em;font-size:32px;font-weight:700;color:#5D1C34">
      {otp}
    </div>
    <p style="font-size:12px;color:#899581;margin-top:24px">
      If you did not create an account with {site_name}, you can safely ignore
      this email.
    </p>
  </body>
</html>"""

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg


def _send_sync(to_email: str, otp: str) -> None:
    """Blocking SMTP send — run via run_in_executor."""
    if not settings.smtp_host:
        # Development fallback: print to stdout
        log.warning(
            "SMTP not configured. OTP for %s: %s  (console mode)", to_email, otp
        )
        print(f"\n[DEV] OTP for {to_email}: {otp}\n", flush=True)
        return

    msg = _build_message(to_email, otp)
    try:
        if settings.smtp_use_tls:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_username:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.ehlo()
                if settings.smtp_tls_starttls:
                    server.starttls()
                    server.ehlo()
                if settings.smtp_username:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
        log.info("OTP email sent to %s", to_email)
    except smtplib.SMTPException as exc:
        log.error("Failed to send OTP email to %s: %s", to_email, exc)
        raise


async def send_otp_email(to_email: str, otp: str) -> None:
    """Non-blocking wrapper — dispatches to thread pool so the event loop
    is not blocked by network I/O."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_sync, to_email, otp)

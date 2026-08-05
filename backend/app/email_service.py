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


# ─── New Order Notification ───────────────────────────────────────────────────

def _smtp_send(to_email: str, msg: MIMEMultipart) -> None:
    """Shared SMTP dispatch used by all notification senders."""
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


def _build_new_order_message(
    to_email: str,
    order_number: str,
    customer_name: str,
    customer_email: str,
    items: list,
    subtotal: float,
    shipping_cost: float,
    total: float,
    shipping_address: dict,
) -> MIMEMultipart:
    site_name = settings.site_name
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[{site_name}] New Order {order_number}"
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    items_rows = "".join(
        f"<tr>"
        f"<td style='padding:8px;border-bottom:1px solid #F0E9E3'>{i.get('product_name', '')}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #F0E9E3;text-align:center'>{i.get('quantity', '')}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #F0E9E3;text-align:right'>Rs. {i.get('subtotal', 0):,.0f}</td>"
        f"</tr>"
        for i in items
    )

    addr = shipping_address
    addr_line = ", ".join(filter(None, [
        addr.get("address_line1"), addr.get("address_line2"),
        addr.get("city"), addr.get("state"),
    ]))
    shipping_display = "Free" if shipping_cost == 0 else f"Rs. {shipping_cost:,.0f}"

    html = f"""\
<html>
  <body style="font-family:sans-serif;color:#11100E;max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:700">IoT<span style="color:#A67D45">Mart</span></span>
    </div>
    <h2 style="font-size:20px;color:#5D1C34;margin-bottom:4px">New Order Received</h2>
    <p style="color:#899581;margin-bottom:24px;font-size:14px">
      Order <strong style="color:#11100E">{order_number}</strong> has just been placed.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#F0E9E3">
        <th style="padding:8px;text-align:left;font-size:12px;color:#899581">Product</th>
        <th style="padding:8px;text-align:center;font-size:12px;color:#899581">Qty</th>
        <th style="padding:8px;text-align:right;font-size:12px;color:#899581">Subtotal</th>
      </tr>
      {items_rows}
    </table>
    <table style="width:100%;margin-bottom:20px;font-size:14px">
      <tr><td style="color:#899581;padding:4px 0">Subtotal</td><td style="text-align:right">Rs. {subtotal:,.0f}</td></tr>
      <tr><td style="color:#899581;padding:4px 0">Shipping</td><td style="text-align:right">{shipping_display}</td></tr>
      <tr style="font-weight:700;font-size:16px">
        <td style="padding:8px 0 4px">Total</td>
        <td style="text-align:right;color:#5D1C34">Rs. {total:,.0f}</td>
      </tr>
    </table>
    <div style="background:#F0E9E3;border-radius:10px;padding:16px;margin-bottom:20px;font-size:13px">
      <p style="margin:0 0 4px;font-weight:600">Customer</p>
      <p style="margin:0">{customer_name}</p>
      <p style="margin:0;color:#899581">{customer_email}</p>
      <p style="margin:10px 0 4px;font-weight:600">Shipping Address</p>
      <p style="margin:0">{addr.get('first_name', '')} {addr.get('last_name', '')}</p>
      <p style="margin:0;color:#899581">{addr_line}</p>
      <p style="margin:0;color:#899581">{addr.get('phone', '')}</p>
    </div>
    <p style="font-size:12px;color:#899581;text-align:center">
      Log in to the admin panel to manage this order.
    </p>
  </body>
</html>"""

    plain = (
        f"New order {order_number} from {customer_name} ({customer_email})\n"
        f"Total: Rs. {total:,.0f}\n"
        f"Items: {len(items)}\n"
        f"Address: {addr_line}"
    )
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg


def _send_new_order_sync(
    to_email: str,
    order_number: str,
    customer_name: str,
    customer_email: str,
    items: list,
    subtotal: float,
    shipping_cost: float,
    total: float,
    shipping_address: dict,
) -> None:
    if not settings.smtp_host:
        log.warning("[DEV] New order %s from %s — SMTP not configured, skipping email", order_number, customer_email)
        print(f"\n[DEV] New order: {order_number} | {customer_email} | Rs. {total:,.0f}\n", flush=True)
        return
    msg = _build_new_order_message(
        to_email, order_number, customer_name, customer_email,
        items, subtotal, shipping_cost, total, shipping_address,
    )
    try:
        _smtp_send(to_email, msg)
        log.info("New order notification sent to %s for order %s", to_email, order_number)
    except smtplib.SMTPException as exc:
        log.error("Failed to send new order email for %s: %s", order_number, exc)


async def send_new_order_email(
    to_email: str,
    order_number: str,
    customer_name: str,
    customer_email: str,
    items: list,
    subtotal: float,
    shipping_cost: float,
    total: float,
    shipping_address: dict,
) -> None:
    """Fire-and-forget new-order notification to the store admin email.
    Never raises — email failure must not block the order response."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, _send_new_order_sync,
        to_email, order_number, customer_name, customer_email,
        items, subtotal, shipping_cost, total, shipping_address,
    )


# ─── Contact Message Notification ────────────────────────────────────────────

def _send_contact_sync(
    to_email: str,
    sender_name: str,
    sender_email: str,
    subject: str,
    message: str,
) -> None:
    if not settings.smtp_host:
        log.warning("[DEV] Contact from %s — SMTP not configured, skipping email", sender_email)
        print(f"\n[DEV] Contact message from {sender_name} <{sender_email}>: {subject}\n", flush=True)
        return

    site_name = settings.site_name
    mime_msg = MIMEMultipart("alternative")
    mime_msg["Subject"] = f"[{site_name}] Contact: {subject}"
    mime_msg["From"]    = settings.smtp_from_email
    mime_msg["To"]      = to_email
    mime_msg["Reply-To"] = sender_email

    html = f"""\
<html>
  <body style="font-family:sans-serif;color:#11100E;max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:700">IoT<span style="color:#A67D45">Mart</span></span>
    </div>
    <h2 style="font-size:20px;color:#5D1C34;margin-bottom:4px">New Contact Message</h2>
    <div style="background:#F0E9E3;border-radius:10px;padding:16px;margin:20px 0;font-size:13px">
      <p style="margin:0 0 4px"><strong>From:</strong> {sender_name}</p>
      <p style="margin:0 0 4px"><strong>Email:</strong>
        <a href="mailto:{sender_email}" style="color:#5D1C34">{sender_email}</a>
      </p>
      <p style="margin:0"><strong>Subject:</strong> {subject}</p>
    </div>
    <div style="border:1px solid #CDBBAD;border-radius:10px;padding:16px;font-size:14px;
                line-height:1.6;white-space:pre-wrap">{message}</div>
    <p style="font-size:12px;color:#899581;margin-top:20px;text-align:center">
      Reply directly to this email to respond to {sender_name}.
    </p>
  </body>
</html>"""

    plain = f"From: {sender_name} <{sender_email}>\nSubject: {subject}\n\n{message}"
    mime_msg.attach(MIMEText(plain, "plain"))
    mime_msg.attach(MIMEText(html, "html"))

    try:
        _smtp_send(to_email, mime_msg)
        log.info("Contact notification sent to %s from %s", to_email, sender_email)
    except smtplib.SMTPException as exc:
        log.error("Failed to send contact email from %s: %s", sender_email, exc)


async def send_contact_email(
    to_email: str,
    sender_name: str,
    sender_email: str,
    subject: str,
    message: str,
) -> None:
    """Non-blocking contact message notification to the store admin email."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, _send_contact_sync,
        to_email, sender_name, sender_email, subject, message,
    )


# ─── Customer Order Notifications ────────────────────────────────────────────

def _build_customer_order_message(
    to_email: str,
    order_number: str,
    customer_name: str,
    items: list,
    subtotal: float,
    shipping_cost: float,
    total: float,
    shipping_address: dict,
) -> MIMEMultipart:
    """Order confirmation email addressed to the customer."""
    site_name = settings.site_name
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[{site_name}] Order Confirmed: {order_number}"
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    items_rows = "".join(
        f"<tr>"
        f"<td style='padding:8px;border-bottom:1px solid #F0E9E3'>{i.get('product_name', '')}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #F0E9E3;text-align:center'>{i.get('quantity', '')}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #F0E9E3;text-align:right'>Rs. {i.get('subtotal', 0):,.0f}</td>"
        f"</tr>"
        for i in items
    )

    addr = shipping_address
    addr_line = ", ".join(filter(None, [
        addr.get("address_line1"), addr.get("address_line2"),
        addr.get("city"), addr.get("state"),
    ]))
    shipping_display = "Free" if shipping_cost == 0 else f"Rs. {shipping_cost:,.0f}"

    html = f"""\
<html>
  <body style="font-family:sans-serif;color:#11100E;max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:700">IoT<span style="color:#A67D45">Mart</span></span>
    </div>
    <h2 style="font-size:20px;color:#5D1C34;margin-bottom:4px">Thank you for your order!</h2>
    <p style="color:#899581;margin-bottom:24px;font-size:14px">
      Hi {customer_name}, your order <strong style="color:#11100E">{order_number}</strong>
      is confirmed and being prepared. We'll email you as its status changes.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#F0E9E3">
        <th style="padding:8px;text-align:left;font-size:12px;color:#899581">Product</th>
        <th style="padding:8px;text-align:center;font-size:12px;color:#899581">Qty</th>
        <th style="padding:8px;text-align:right;font-size:12px;color:#899581">Subtotal</th>
      </tr>
      {items_rows}
    </table>
    <table style="width:100%;margin-bottom:20px;font-size:14px">
      <tr><td style="color:#899581;padding:4px 0">Subtotal</td><td style="text-align:right">Rs. {subtotal:,.0f}</td></tr>
      <tr><td style="color:#899581;padding:4px 0">Shipping</td><td style="text-align:right">{shipping_display}</td></tr>
      <tr style="font-weight:700;font-size:16px">
        <td style="padding:8px 0 4px">Total</td>
        <td style="text-align:right;color:#5D1C34">Rs. {total:,.0f}</td>
      </tr>
    </table>
    <div style="background:#F0E9E3;border-radius:10px;padding:16px;margin-bottom:20px;font-size:13px">
      <p style="margin:0 0 4px;font-weight:600">Shipping To</p>
      <p style="margin:0">{addr.get('first_name', '')} {addr.get('last_name', '')}</p>
      <p style="margin:0;color:#899581">{addr_line}</p>
      <p style="margin:0;color:#899581">{addr.get('phone', '')}</p>
    </div>
    <p style="font-size:12px;color:#899581;text-align:center">
      Questions about your order? Just reply to this email.
    </p>
  </body>
</html>"""

    plain = (
        f"Thank you for your order {order_number}!\n"
        f"Total: Rs. {total:,.0f}\n"
        f"Shipping to: {addr_line}\n"
        f"Payment: Cash on Delivery\n"
        f"We'll email you as your order status changes."
    )
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg


def _send_customer_order_sync(
    to_email: str,
    order_number: str,
    customer_name: str,
    items: list,
    subtotal: float,
    shipping_cost: float,
    total: float,
    shipping_address: dict,
) -> None:
    if not settings.smtp_host:
        log.warning("[DEV] Order confirmation %s for %s — SMTP not configured, skipping email", order_number, to_email)
        print(f"\n[DEV] Order confirmation: {order_number} | {to_email} | Rs. {total:,.0f}\n", flush=True)
        return
    msg = _build_customer_order_message(
        to_email, order_number, customer_name,
        items, subtotal, shipping_cost, total, shipping_address,
    )
    try:
        _smtp_send(to_email, msg)
        log.info("Order confirmation sent to %s for order %s", to_email, order_number)
    except smtplib.SMTPException as exc:
        log.error("Failed to send order confirmation for %s: %s", order_number, exc)


async def send_order_confirmation_email(
    to_email: str,
    order_number: str,
    customer_name: str,
    items: list,
    subtotal: float,
    shipping_cost: float,
    total: float,
    shipping_address: dict,
) -> None:
    """Non-blocking order confirmation email to the customer. Never raises."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, _send_customer_order_sync,
        to_email, order_number, customer_name,
        items, subtotal, shipping_cost, total, shipping_address,
    )


def _build_order_status_message(to_email: str, order_number: str, status: str) -> MIMEMultipart:
    site_name = settings.site_name
    labels = {
        "processing": ("Order Processing", "Your order is now being processed by our team."),
        "delivered": ("Order Delivered", "Great news! Your order has been delivered."),
        "cancelled": ("Order Cancelled", "Your order has been cancelled."),
    }
    title, body = labels.get(status, (status.title(), f"Your order status has been updated to {status}."))
    color = "#5D1C34" if status == "processing" else "#2E7D32" if status == "delivered" else "#C62828"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[{site_name}] {title}: {order_number}"
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    html = f"""\
<html>
  <body style="font-family:sans-serif;color:#11100E;max-width:480px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:700">IoT<span style="color:#A67D45">Mart</span></span>
    </div>
    <h2 style="font-size:20px;color:{color};margin-bottom:8px">{title}</h2>
    <p style="color:#899581;margin-bottom:24px">Order <strong style="color:#11100E">{order_number}</strong></p>
    <div style="background:#F0E9E3;border-radius:12px;padding:20px;text-align:center;font-size:14px">
      {body}
    </div>
    <p style="font-size:12px;color:#899581;margin-top:24px;text-align:center">
      Track your orders anytime in your account dashboard.
    </p>
  </body>
</html>"""

    plain = f"{title}\nOrder {order_number}\n{body}"
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg


def _send_order_status_sync(to_email: str, order_number: str, status: str) -> None:
    if not settings.smtp_host:
        log.warning("[DEV] Order %s status change (%s) for %s — SMTP not configured, skipping email", order_number, status, to_email)
        print(f"\n[DEV] Order status: {order_number} → {status} | {to_email}\n", flush=True)
        return
    msg = _build_order_status_message(to_email, order_number, status)
    try:
        _smtp_send(to_email, msg)
        log.info("Order status email sent to %s for order %s (%s)", to_email, order_number, status)
    except smtplib.SMTPException as exc:
        log.error("Failed to send status email for %s: %s", order_number, exc)


async def send_order_status_email(to_email: str, order_number: str, status: str) -> None:
    """Non-blocking status notification email to the customer. Never raises."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, _send_order_status_sync,
        to_email, order_number, status,
    )

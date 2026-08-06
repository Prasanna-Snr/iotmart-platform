import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Boolean, Integer, Float, DateTime,
    ForeignKey, Enum as SAEnum, ARRAY, UniqueConstraint, Index,
    Date, Table
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ─── Users ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id:            Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:          Mapped[str]        = mapped_column(String(255), nullable=False)
    email:         Mapped[str]        = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str]      = mapped_column(String(255), nullable=False)
    role:          Mapped[str]        = mapped_column(SAEnum("customer", "admin", name="user_role"), default="customer")
    avatar:        Mapped[str | None] = mapped_column(Text, nullable=True)
    phone:         Mapped[str | None] = mapped_column(String(50), nullable=True)
    address:       Mapped[dict | None]= mapped_column(JSONB, nullable=True)
    is_active:     Mapped[bool]       = mapped_column(Boolean, default=True)
    created_at:    Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at:    Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    orders:   Mapped[list["Order"]]         = relationship("Order", back_populates="user")
    reviews:  Mapped[list["ProductReview"]] = relationship("ProductReview", back_populates="user")


# ─── Categories ───────────────────────────────────────────────────────────────

class Category(Base):
    __tablename__ = "categories"

    id:          Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:        Mapped[str]        = mapped_column(String(255), nullable=False)
    slug:        Mapped[str]        = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str]        = mapped_column(Text, default="")
    image:       Mapped[str]        = mapped_column(Text, default="")
    created_at:  Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow)

    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")


# ─── Brands ───────────────────────────────────────────────────────────────────

class Brand(Base):
    __tablename__ = "brands"

    id:         Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:       Mapped[str]        = mapped_column(String(255), nullable=False)
    slug:       Mapped[str]        = mapped_column(String(255), unique=True, nullable=False, index=True)
    logo:       Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow)

    products: Mapped[list["Product"]] = relationship("Product", back_populates="brand")


# ─── Products ─────────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id:               Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:             Mapped[str]        = mapped_column(String(255), nullable=False)
    slug:             Mapped[str]        = mapped_column(String(255), unique=True, nullable=False, index=True)
    sku:              Mapped[str]        = mapped_column(String(100), unique=True, nullable=False)
    description:      Mapped[str]        = mapped_column(Text, default="")
    short_description:Mapped[str]        = mapped_column(Text, default="")
    price:            Mapped[float]      = mapped_column(Float, nullable=False)
    original_price:   Mapped[float|None] = mapped_column(Float, nullable=True)
    currency:         Mapped[str]        = mapped_column(String(10), default="USD")
    images:           Mapped[list]       = mapped_column(JSONB, default=list)
    tags:             Mapped[list]       = mapped_column(JSONB, default=list)
    specs:            Mapped[list]       = mapped_column(JSONB, default=list)  # [{label, value}]
    stock:            Mapped[int]        = mapped_column(Integer, default=0)
    rating:           Mapped[float]      = mapped_column(Float, default=0.0)
    review_count:     Mapped[int]        = mapped_column(Integer, default=0)
    featured:         Mapped[bool]       = mapped_column(Boolean, default=False)
    new_arrival:      Mapped[bool]       = mapped_column(Boolean, default=False)
    best_seller:      Mapped[bool]       = mapped_column(Boolean, default=False)
    in_stock:         Mapped[bool]       = mapped_column(Boolean, default=True)
    weight:           Mapped[str|None]   = mapped_column(String(50), nullable=True)
    dimensions:       Mapped[str|None]   = mapped_column(String(100), nullable=True)
    related_product_ids: Mapped[list]    = mapped_column(JSONB, default=list)
    category_id:      Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False, index=True)
    brand_id:         Mapped[uuid.UUID | None]  = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True, index=True)
    search_vector:    Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    created_at:       Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at:       Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        # faster catalog filtering + search
        Index("ix_products_category_price", "category_id", "price"),
        Index("ix_products_brand_price", "brand_id", "price"),
        Index("ix_products_search_vector", "search_vector", postgresql_using="gin"),
    )

    category: Mapped["Category"]            = relationship("Category", back_populates="products")
    brand:    Mapped["Brand"]               = relationship("Brand", back_populates="products")
    reviews:  Mapped[list["ProductReview"]] = relationship("ProductReview", back_populates="product", cascade="all, delete-orphan")


class ProductReview(Base):
    __tablename__ = "product_reviews"

    id:         Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id:    Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name:  Mapped[str]        = mapped_column(String(255), nullable=False)
    user_avatar:Mapped[str|None]   = mapped_column(Text, nullable=True)
    rating:     Mapped[int]        = mapped_column(Integer, nullable=False)
    title:      Mapped[str]        = mapped_column(String(255), nullable=False)
    body:       Mapped[str]        = mapped_column(Text, default="")
    verified:   Mapped[bool]       = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow)

    product: Mapped["Product"] = relationship("Product", back_populates="reviews")
    user:    Mapped["User"]    = relationship("User", back_populates="reviews")


# ─── Tutorial Categories ──────────────────────────────────────────────────────

class TutorialCategory(Base):
    __tablename__ = "tutorial_categories"

    id:          Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:        Mapped[str]       = mapped_column(String(255), nullable=False)
    slug:        Mapped[str]       = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str]       = mapped_column(Text, default="")
    icon:        Mapped[str]       = mapped_column(String(100), default="")
    created_at:  Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)

    tutorials: Mapped[list["Tutorial"]] = relationship("Tutorial", back_populates="category")


# ─── Tutorials ────────────────────────────────────────────────────────────────

class Tutorial(Base):
    __tablename__ = "tutorials"

    id:                  Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title:               Mapped[str]       = mapped_column(String(255), nullable=False)
    slug:                Mapped[str]       = mapped_column(String(255), unique=True, nullable=False, index=True)
    description:         Mapped[str]       = mapped_column(Text, default="")
    short_description:   Mapped[str]       = mapped_column(Text, default="")
    difficulty:          Mapped[str]       = mapped_column(SAEnum("Beginner", "Intermediate", "Advanced", name="difficulty_level"), default="Beginner")
    estimated_time:      Mapped[str]       = mapped_column(String(100), default="")
    components:          Mapped[list]      = mapped_column(JSONB, default=list)
    sensors:             Mapped[list]      = mapped_column(JSONB, default=list)
    microcontrollers:    Mapped[list]      = mapped_column(JSONB, default=list)
    circuit_diagram:     Mapped[str|None]  = mapped_column(Text, nullable=True)
    wiring_instructions: Mapped[list]      = mapped_column(JSONB, default=list)
    source_code:         Mapped[str]       = mapped_column(Text, default="")
    code_language:       Mapped[str]       = mapped_column(String(50), default="cpp")
    steps:               Mapped[list]      = mapped_column(JSONB, default=list)
    prerequisites:       Mapped[list]      = mapped_column(JSONB, default=list)
    learning_outcomes:   Mapped[list]      = mapped_column(JSONB, default=list)
    related_product_ids: Mapped[list]      = mapped_column(JSONB, default=list)
    related_tutorial_ids:Mapped[list]      = mapped_column(JSONB, default=list)
    cover_image:         Mapped[str]       = mapped_column(Text, default="")
    views:               Mapped[int]       = mapped_column(Integer, default=0)
    featured:            Mapped[bool]      = mapped_column(Boolean, default=False)
    published:           Mapped[bool]      = mapped_column(Boolean, default=False)
    author:              Mapped[str]       = mapped_column(String(255), default="")
    tags:                Mapped[list]      = mapped_column(JSONB, default=list)
    category_id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tutorial_categories.id"), nullable=False, index=True)
    created_at:          Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at:          Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    category: Mapped["TutorialCategory"] = relationship("TutorialCategory", back_populates="tutorials")


# ─── Orders ───────────────────────────────────────────────────────────────────

class Order(Base):
    __tablename__ = "orders"

    id:               Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number:     Mapped[str]       = mapped_column(String(50), unique=True, nullable=False, index=True)
    user_id:          Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_email:   Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    items:            Mapped[list]      = mapped_column(JSONB, nullable=False)
    shipping_address: Mapped[dict]      = mapped_column(JSONB, nullable=False)
    status:           Mapped[str]       = mapped_column(
        SAEnum("pending","processing","shipped","delivered","cancelled","refunded", name="order_status"),
        default="pending", index=True
    )
    subtotal:         Mapped[float]     = mapped_column(Float, nullable=False)
    shipping_cost:    Mapped[float]     = mapped_column(Float, default=0.0)
    discount_amount:  Mapped[float]     = mapped_column(Float, default=0.0)
    coupon_code:      Mapped[str|None]  = mapped_column(String(50), nullable=True)
    total:            Mapped[float]     = mapped_column(Float, nullable=False)
    payment_method:   Mapped[str]       = mapped_column(String(100), default="")
    payment_status:   Mapped[str]       = mapped_column(
        SAEnum("pending","paid","failed","refunded", name="payment_status"),
        default="pending"
    )
    notes:            Mapped[str|None]  = mapped_column(Text, nullable=True)
    created_at:       Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at:       Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship("User", back_populates="orders")


# ─── CMS Pages ────────────────────────────────────────────────────────────────

class CMSPage(Base):
    __tablename__ = "cms_pages"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title:      Mapped[str]       = mapped_column(String(255), nullable=False)
    slug:       Mapped[str]       = mapped_column(String(255), unique=True, nullable=False, index=True)
    status:     Mapped[str]       = mapped_column(SAEnum("published","draft", name="page_status"), default="draft")
    blocks:     Mapped[list]      = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ─── Contact Messages ─────────────────────────────────────────────────────────

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:       Mapped[str]       = mapped_column(String(255), nullable=False)
    email:      Mapped[str]       = mapped_column(String(255), nullable=False)
    subject:    Mapped[str]       = mapped_column(String(100), nullable=False)
    message:    Mapped[str]       = mapped_column(Text, nullable=False)
    read:       Mapped[bool]      = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Site Settings ────────────────────────────────────────────────────────────

class SiteSettings(Base):
    __tablename__ = "site_settings"

    key:        Mapped[str]      = mapped_column(String(100), primary_key=True)
    value:      Mapped[str]      = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ─── Email OTP Pending Verification ─────────────────────────────────────────

class EmailPendingVerification(Base):
    """Stores pending email OTP verifications.

    One row per email (unique constraint).  On resend the existing row is
    replaced (upsert) so there is always at most one active OTP per address.
    """

    __tablename__ = "email_pending_verifications"

    id:            Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email:         Mapped[str]       = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_otp:    Mapped[str]       = mapped_column(String(255), nullable=False)
    expires_at:    Mapped[datetime]  = mapped_column(DateTime(timezone=True), nullable=False)
    attempts:      Mapped[int]       = mapped_column(Integer, default=0, nullable=False)
    used:          Mapped[bool]      = mapped_column(Boolean, default=False, nullable=False)
    created_at:    Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Banners ──────────────────────────────────────────────────────────────────

class Banner(Base):
    __tablename__ = "banners"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title:      Mapped[str]       = mapped_column(String(255), nullable=False)
    subtitle:   Mapped[str]       = mapped_column(Text, default="")
    cta_text:   Mapped[str]       = mapped_column(String(100), default="")
    cta_link:   Mapped[str]       = mapped_column(String(500), default="")
    image:      Mapped[str]       = mapped_column(Text, default="")
    active:     Mapped[bool]      = mapped_column(Boolean, default=True)
    order:      Mapped[int]       = mapped_column(Integer, default=0)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Analytics ────────────────────────────────────────────────────────────────

class PageView(Base):
    """One record per page view. IP is hashed, never stored raw."""
    __tablename__ = "page_views"

    id:           Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visitor_id:   Mapped[str]        = mapped_column(String(64), nullable=False, index=True)   # anonymous stable ID
    session_id:   Mapped[str]        = mapped_column(String(64), nullable=False, index=True)
    ip_hash:      Mapped[str]        = mapped_column(String(64), nullable=False)               # SHA-256 of IP
    path:         Mapped[str]        = mapped_column(String(2048), nullable=False, index=True)
    referrer:     Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent:   Mapped[str | None] = mapped_column(Text, nullable=True)
    browser:      Mapped[str | None] = mapped_column(String(100), nullable=True)
    browser_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    os:           Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_type:  Mapped[str | None] = mapped_column(String(50), nullable=True)   # desktop/mobile/tablet/bot
    country:      Mapped[str | None] = mapped_column(String(100), nullable=True)
    city:         Mapped[str | None] = mapped_column(String(100), nullable=True)
    duration_ms:  Mapped[int | None] = mapped_column(Integer, nullable=True)      # set on session end
    created_at:   Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    __table_args__ = (
        # fast daily aggregations + unique-visitor queries
        Index("ix_page_views_created_visitor", "created_at", "visitor_id"),
    )


class OnlineVisitor(Base):
    """Tracks currently active visitors (TTL-based heartbeat)."""
    __tablename__ = "online_visitors"

    session_id:   Mapped[str]       = mapped_column(String(64), primary_key=True)
    visitor_id:   Mapped[str]       = mapped_column(String(64), nullable=False, index=True)
    path:         Mapped[str]       = mapped_column(String(2048), nullable=False)
    last_seen:    Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, index=True)
    created_at:   Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Newsletter ───────────────────────────────────────────────────────────────

class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email:      Mapped[str]       = mapped_column(String(255), unique=True, nullable=False, index=True)
    subscribed: Mapped[bool]      = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Wishlist ─────────────────────────────────────────────────────────────────

class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),)

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)

    product: Mapped["Product"] = relationship("Product")


# ─── Saved Addresses ──────────────────────────────────────────────────────────

class SavedAddress(Base):
    __tablename__ = "saved_addresses"

    id:            Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:       Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    label:         Mapped[str]       = mapped_column(String(100), default="Home")
    full_name:     Mapped[str]       = mapped_column(String(255), nullable=False)
    phone:         Mapped[str]       = mapped_column(String(50), nullable=False)
    address_line1: Mapped[str]       = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str]       = mapped_column(String(255), default="")
    city:          Mapped[str]       = mapped_column(String(120), nullable=False)
    state:         Mapped[str]       = mapped_column(String(120), nullable=False)
    zip_code:      Mapped[str]       = mapped_column(String(20), default="")
    country:       Mapped[str]       = mapped_column(String(120), default="")
    is_default:    Mapped[bool]      = mapped_column(Boolean, default=False)
    created_at:    Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Rewards ──────────────────────────────────────────────────────────────────

class RewardTransaction(Base):
    """Signed point ledger entry. Positive = earned, negative = spent/voided."""
    __tablename__ = "reward_transactions"

    id:          Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:     Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    points:      Mapped[int]            = mapped_column(Integer, nullable=False)
    description: Mapped[str]            = mapped_column(Text, default="")
    order_id:    Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at:  Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Password Reset ───────────────────────────────────────────────────────────

class PasswordResetToken(Base):
    """One-time OTP for resetting an existing user's password.

    Kept separate from EmailPendingVerification (registration) so the two
    flows never collide over the unique email constraint.
    """
    __tablename__ = "password_reset_tokens"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email:      Mapped[str]       = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_otp: Mapped[str]       = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), nullable=False)
    attempts:   Mapped[int]       = mapped_column(Integer, default=0, nullable=False)
    used:       Mapped[bool]      = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Core Web Vitals ──────────────────────────────────────────────────────────

class VitalMetric(Base):
    """Real-user Core Web Vitals samples from the browser beacon."""
    __tablename__ = "vital_metrics"

    id:         Mapped[uuid.UUID]        = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:       Mapped[str]              = mapped_column(String(50), nullable=False, index=True)
    value:      Mapped[float]            = mapped_column(Float, nullable=False)
    rating:     Mapped[str | None]       = mapped_column(String(20), nullable=True)
    label:      Mapped[str | None]       = mapped_column(String(50), nullable=True)
    path:       Mapped[str | None]       = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime]         = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Admin Audit Log ──────────────────────────────────────────────────────────

class AdminAuditLog(Base):
    """Immutable trail of privileged actions (admin mutations + security events).

    Append-only: entries are never updated or deleted so the trail stays
    trustworthy for forensics.
    """
    __tablename__ = "admin_audit_logs"

    id:          Mapped[uuid.UUID]          = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id:    Mapped[uuid.UUID | None]   = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    actor_email: Mapped[str | None]         = mapped_column(String(255), nullable=True)
    action:      Mapped[str]                = mapped_column(String(50), nullable=False, index=True)
    target_type: Mapped[str]                = mapped_column(String(50), nullable=False)
    target_id:   Mapped[str | None]         = mapped_column(String(100), nullable=True)
    detail:      Mapped[str]                = mapped_column(Text, default="")
    created_at:  Mapped[datetime]           = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


# ─── Coupons ──────────────────────────────────────────────────────────────────

class Coupon(Base):
    """Discount codes. `percent_off` or `fixed_amount` (in the same currency
    as products) — exactly one should be set. Optional min order subtotal,
    max uses overall and per-user use limits, and an expiry window."""

    __tablename__ = "coupons"

    id:            Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code:          Mapped[str]        = mapped_column(String(50), unique=True, nullable=False, index=True)
    description:   Mapped[str]        = mapped_column(Text, default="")
    percent_off:   Mapped[float|None] = mapped_column(Float, nullable=True)
    fixed_amount:  Mapped[float|None] = mapped_column(Float, nullable=True)
    min_subtotal:  Mapped[float]      = mapped_column(Float, default=0.0)
    max_uses:      Mapped[int|None]   = mapped_column(Integer, nullable=True)      # overall cap
    used_count:    Mapped[int]        = mapped_column(Integer, default=0)
    max_uses_per_user: Mapped[int|None] = mapped_column(Integer, nullable=True)
    active:        Mapped[bool]       = mapped_column(Boolean, default=True)
    starts_at:     Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at:    Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:    Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow)


# ─── Daily Analytics Rollup ───────────────────────────────────────────────────

class DailyAnalytics(Base):
    """Pre-aggregated per-day analytics so dashboards avoid scanning the
    unbounded `page_views` table. Rebuilt by `app.analytics_jobs`."""

    __tablename__ = "daily_analytics"

    day:            Mapped[Date]      = mapped_column(Date, primary_key=True)
    views:          Mapped[int]       = mapped_column(Integer, default=0)
    visitors:       Mapped[int]       = mapped_column(Integer, default=0)   # distinct visitor_id
    sessions:       Mapped[int]       = mapped_column(Integer, default=0)   # distinct session_id
    avg_duration_ms:Mapped[int|None]  = mapped_column(Integer, nullable=True)
    top_paths:      Mapped[list]      = mapped_column(JSONB, default=list)  # [{path, views}]
    devices:        Mapped[list]      = mapped_column(JSONB, default=list)  # [{device_type, views}]
    browsers:       Mapped[list]      = mapped_column(JSONB, default=list)  # [{browser, views}]
    countries:      Mapped[list]      = mapped_column(JSONB, default=list)  # [{country, views}]


# ─── User Uploads (quota) ─────────────────────────────────────────────────────

class UserUpload(Base):
    """Tracks every accepted file upload so per-user storage quotas can be
    enforced server-side."""

    __tablename__ = "user_uploads"

    id:         Mapped[uuid.UUID]          = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:    Mapped[uuid.UUID | None]   = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    path:       Mapped[str]                = mapped_column(Text, nullable=False)
    size_bytes: Mapped[int]                = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime]           = mapped_column(DateTime(timezone=True), default=utcnow)

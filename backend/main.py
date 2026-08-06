import logging
import os
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings as app_settings
from app.limiter import limiter
from app.routers import auth, users, categories, brands, products, tutorials, orders, cms, upload, banners, admin, reviews, settings, contact, analytics, newsletter, wishlist, addresses, rewards, vitals, coupons

log = logging.getLogger("app.access")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed exclusively by Alembic migrations.
    # Run 'alembic upgrade head' to apply pending migrations.
    yield


app = FastAPI(
    title="IoTMart API",
    description="Backend API for IoTMart e-commerce platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Structured error responses
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "error_type": "validation_error"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_type": "internal_server_error"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in app_settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_and_access_log(request: Request, call_next):
    """Attach a correlation X-Request-ID and emit a structured access log.

    The ID is echoed on the response so clients can reference a specific
    request when reporting issues.
    """
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log.exception(
            "request_failed method=%s path=%s rid=%s", request.method, request.url.path, rid
        )
        raise
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Request-ID"] = rid
    client = request.client.host if request.client else "-"
    log.info(
        'method=%s path=%s status=%s ip=%s duration_ms=%s rid=%s',
        request.method, request.url.path, response.status_code, client, duration_ms, rid,
    )
    return response


# Routers
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(users.router,      prefix="/api/users",      tags=["Users"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(brands.router,     prefix="/api/brands",     tags=["Brands"])
app.include_router(products.router,   prefix="/api/products",   tags=["Products"])
app.include_router(tutorials.router,  prefix="/api/tutorials",  tags=["Tutorials"])
app.include_router(orders.router,     prefix="/api/orders",     tags=["Orders"])
app.include_router(cms.router,        prefix="/api/cms",        tags=["CMS"])
app.include_router(banners.router,    prefix="/api/banners",    tags=["Banners"])
app.include_router(admin.router,      prefix="/api/admin",      tags=["Admin"])
app.include_router(upload.router,     prefix="/api/upload",     tags=["Upload"])
app.include_router(reviews.router,    prefix="/api/reviews",   tags=["Reviews"])
app.include_router(settings.router,   prefix="/api/settings",  tags=["Settings"])
app.include_router(contact.router,    prefix="/api/contact",   tags=["Contact"])
app.include_router(analytics.router,  prefix="/api/analytics", tags=["Analytics"])
app.include_router(newsletter.router, prefix="/api/newsletter", tags=["Newsletter"])
app.include_router(wishlist.router,   prefix="/api/wishlist",   tags=["Wishlist"])
app.include_router(addresses.router,  prefix="/api/addresses",  tags=["Addresses"])
app.include_router(rewards.router,    prefix="/api/rewards",    tags=["Rewards"])
app.include_router(vitals.router,     prefix="/api/vitals",     tags=["Vitals"])
app.include_router(coupons.router,    prefix="/api/coupons",    tags=["Coupons"])

# Serve uploaded files at /uploads/*
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "iotmart-api"}

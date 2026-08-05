import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.database import engine, Base
from app.limiter import limiter
from app.routers import auth, users, categories, brands, products, tutorials, orders, cms, upload, banners, admin, reviews, settings, contact, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try to create tables, but don't block startup if DB is unavailable
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Warning: Could not create tables on startup: {e}")
        print("Run 'alembic upgrade head' manually to apply migrations.")
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Serve uploaded files at /uploads/*
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "iotmart-api"}

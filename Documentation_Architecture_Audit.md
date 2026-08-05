# IoTMart — Architecture & Code Audit

**Project:** IoTMart (`iot-store`)
**Date of audit:** August 5, 2026
**Scope:** Full-stack analysis of the entire repository — Next.js frontend, FastAPI backend, PostgreSQL database, Docker, configuration, tests, and deployment artifacts. No code was modified.

---

## 1. Project Overview

### What this project is

IoTMart is a full-stack e-commerce platform for IoT hardware — sensors, microcontrollers, development boards, wireless modules, and related electronics. It combines a customer-facing storefront with tutorials (step-by-step IoT project guides), a customer account area, and a full admin back office with a visual page builder.

The name "IoTMart" and content target the Nepal market (metadata says "IoT Gadgets, Sensors & Dev Boards Nepal", currency is NPR / "Rs."), although several defaults and mock datasets still use US-style data (USD, `$` values, US addresses), which signals the project is mid-migration to a Nepali store.

### What problem it solves

Buying IoT components online is usually fragmented: sellers list parts with no guidance, and buyers do not know which sensor pairs with which microcontroller or how to wire them. IoTMart solves this by:

1. Selling the physical components (products + inventory + orders).
2. Teaching buyers how to use them (structured tutorials with wiring tables, source code, and steps).
3. Offering a merchant/operator back office to manage the whole catalog, orders, customers, reviews, content pages, banners, and analytics.

### Target users

| User | Description |
|---|---|
| **Customers** | Makers, students, hobbyists, and engineers buying IoT parts, reading tutorials, and tracking orders. |
| **Admins** | Store operators managing products, orders, customers, tutorials, CMS pages, banners, settings, and analytics. |
| **Visitors** | Anonymous shoppers who browse, search, and learn before registering. |

### Main features

- **Storefront:** Homepage with featured products/tutorials, category grid, product listing with faceted filters (category, brand, search, price range, in-stock), search page, product detail with gallery/lightbox/specs/reviews/related items, cart (localStorage), COD checkout, profile with order history.
- **Tutorials:** Tutorial listing with category/difficulty filters, tutorial detail with prerequisites, wiring table, steps, source code, learning outcomes, and linked shop components.
- **Authentication:** OTP-gated email registration (3-step: request OTP → verify OTP → register), email+password login, JWT access tokens + refresh cookie, customer/admin roles.
- **Admin panel:** Dashboard, products (CRUD), product categories (API-backed at `/admin/categories`) plus a duplicate mock page at `/admin/products/categories`, brands, orders (list/detail/status), customers, tutorials (CRUD + categories), reviews moderation, banners, analytics dashboard, settings, and a visual CMS page builder.
- **CMS page builder:** Figma-like 3-panel editor (component tree / canvas / properties) with 14 block types, inline WYSIWYG editing, and preview mode.
- **Analytics:** First-party visitor tracking — page views, sessions, heartbeats, online visitors, device/browser/country breakdowns, daily trends. IPs are hashed, bots filtered.
- **Email:** OTP emails, new-order notifications to admin, and contact-form notifications via SMTP (with console fallback in dev).
- **SEO:** sitemap.xml, robots.txt, canonical URLs, Open Graph/Twitter cards, and rich JSON-LD (Organization, WebSite, Product, Review, TechArticle, HowTo, FAQPage, BreadcrumbList, ItemList).

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.12 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS v4, lucide-react, clsx + tailwind-merge |
| Backend | Python 3.12, FastAPI 0.115, SQLAlchemy 2.0 (async), asyncpg, Alembic, Pydantic v2, python-jose (JWT), passlib + bcrypt, slowapi (rate limiting), user-agents, httpx |
| Database | PostgreSQL 16 |
| Email | SMTP via stdlib smtplib (`smtplib` in a thread-pool executor) |
| Containerization | Docker Compose (db + api + web services) |
| Testing | pytest + pytest-asyncio (OTP flow, analytics) |
| Tooling | ESLint 9 (flat config), Prettier-style formatting by convention, Next.js font optimization |

Notable: there is **no** frontend state/data library (no React Query/SWR), **no** ORM migration for the frontend, **no** CI/CD pipeline, **no** production reverse proxy config, and **no** payment gateway integration.

### Overall architecture

```
Browser
   │
   ▼
Next.js App Router (src/app)
   ├─ Server Components (RSC) → call FastAPI directly via API_INTERNAL_URL
   ├─ Client Components → call relative /api/* (Next.js catch-all proxy route)
   └─ /api/[...path] proxy → forwards to FastAPI (localhost:8000)
                                   │
                                   ▼
                          FastAPI app (backend/main.py)
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
       Routers (13)          Services (analytics)     Static /uploads
            │                      │                      │
            ▼                      ▼                      ▼
    SQLAlchemy async        SQLAlchemy async         local filesystem
            │                      │
            ▼                      ▼
              PostgreSQL 16 (docker-compose "db")
```

The key architectural decision: **Next.js acts as both the UI and an API gateway.** A single catch-all route `src/app/api/[...path]/route.ts` forwards client-side requests to the FastAPI backend, so the frontend never exposes the backend host to the browser. Server components call the backend directly using an internal URL. Uploaded files are served from FastAPI and rewritten by Next.js (`/uploads/*` → `localhost:8000/uploads/*`).

---

## 2. Folder Structure

```
iot-store/
├── backend/                      # FastAPI application (Python)
│   ├── alembic.ini               # Alembic migration config
│   ├── main.py                   # FastAPI app factory, router wiring, CORS
│   ├── requirements.txt          # Python dependencies (pinned)
│   ├── Dockerfile                # Backend container (uvicorn)
│   ├── app/
│   │   ├── config.py             # pydantic-settings (env vars)
│   │   ├── database.py           # async engine + session factory
│   │   ├── security.py           # JWT + bcrypt + auth dependencies
│   │   ├── email_service.py      # OTP / order / contact emails
│   │   ├── limiter.py            # shared slowapi Limiter instance
│   │   ├── models/models.py      # all SQLAlchemy ORM models
│   │   ├── routers/              # 13 API routers
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/             # analytics service (DB ops)
│   │   └── public/uploads/       # uploaded files (gitignored)
│   ├── migrations/               # Alembic version scripts
│   └── tests/                    # pytest suite (OTP, analytics)
├── src/                          # Next.js frontend (TypeScript)
│   ├── app/                      # App Router: routes, layouts, error/loading
│   │   ├── (customer)/           # public storefront route group
│   │   ├── admin/                # admin route group (client-side protected)
│   │   └── api/[...path]/        # catch-all proxy to FastAPI
│   ├── components/               # UI components (admin, layout, product,
│   │                             # profile, tutorial, ui)
│   ├── context/CartContext.tsx   # global cart state (localStorage)
│   ├── data/                     # static mock data (products, orders, etc.)
│   ├── hooks/useStoreSettings.ts # fetch shipping settings hook
│   ├── lib/                      # api client, auth hooks, SEO, CMS store, utils
│   └── types/index.ts            # shared TypeScript interfaces
├── public/                       # static assets (video, icons, webmanifest)
├── docker-compose.yml            # db + api + web services
├── Dockerfile.web                # frontend container (npm run dev)
├── next.config.ts                # headers, rewrites, image config
├── tailwind.config.ts            # Tailwind theme (brand colors)
├── tsconfig.json                 # TypeScript config with @/* path alias
├── eslint.config.mjs             # ESLint flat config (next core-web-vitals + ts)
├── postcss.config.mjs            # Tailwind v4 PostCSS plugin
├── .env / .env.example           # environment variables
├── package.json                  # frontend deps + scripts
├── AGENTS.md / CLAUDE.md         # agent instructions
├── DATABASE_AUDIT.md             # prior database audit (43KB)
└── README.md                     # boilerplate (create-next-app)
```

### Folder-by-folder purpose

**`backend/`** — The entire server-side application. Owns the data model, business logic, authentication, email, and file uploads. It is the single source of truth for the database schema (via SQLAlchemy models + Alembic migrations). The frontend depends on it for every dynamic feature. It exists because e-commerce logic (orders, auth, email, stock) must live behind a controlled API, not in the browser.

**`backend/app/`** — Python package containing the application. Subfolders:
- `models/` — ORM classes; every other backend module depends on these.
- `routers/` — HTTP endpoints; depends on models, schemas, security, and services.
- `schemas/` — Pydantic validation layer; used by routers and mirrored by frontend types.
- `services/` — business-logic helpers; currently only analytics.
- `config.py`, `database.py`, `security.py`, `email_service.py`, `limiter.py` — cross-cutting infrastructure used by all routers.

**`src/app/`** — Next.js App Router. Routes are split into two route groups: `(customer)` (public storefront, shared customer layout) and `admin` (back office, shared admin layout). `api/[...path]/route.ts` is the client-side API gateway to FastAPI. `app/layout.tsx` is the root layout (metadata, CartProvider, WebVitals, JSON-LD).

**`src/components/`** — Reusable React components organized by domain (`admin`, `layout`, `product`, `profile`, `tutorial`, `ui`). The `ui/` folder holds generic primitives; domain folders hold feature-specific components. Pages depend on these heavily.

**`src/context/`** — `CartContext.tsx`, a client-side cart persisted to `localStorage`. The whole storefront cart flow depends on it.

**`src/data/`** — Static mock data (products, tutorials, orders, categories) used by the admin dashboard, the mock admin product-categories page, and the mock banners page. This exists because several admin surfaces were prototyped before the API was ready and were never migrated.

**`src/lib/`** — Frontend infrastructure: `api.ts` (typed API client), `customerAuth.ts` / `adminAuth.ts` (localStorage auth hooks), `seo.ts` (metadata + JSON-LD generators), `cms-store.ts` (in-memory CMS page store + block type system), `constants.ts`, `utils.ts`. Most pages depend on this layer.

**`src/hooks/`** — Shared React hooks (`useStoreSettings`).

**`src/types/`** — Shared TypeScript interfaces mirroring the backend Pydantic schemas.

**`public/`** — Static assets: `bg-video.mp4` (homepage hero), SVG icons, `site.webmanifest`, and a note that `og-default.png`, `logo.png`, and `apple-touch-icon.png` still need to be created.

**`backend/migrations/`** — Alembic version scripts for the PostgreSQL schema.

**`backend/tests/`** — pytest suite; the only automated tests in the repo.

**Root config files** — `docker-compose.yml`, `Dockerfile.web`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.example` — see Section 13.

---

## 3. File-by-File Explanation

This section covers every important file. Files are grouped; the notation `X → used by Y` means "X is imported/used by Y."

### 3.1 Root configuration files

#### `package.json`

- **Purpose:** Frontend npm manifest and scripts.
- **Scripts:** `dev` (next dev), `build` (next build), `start` (next start), `lint` (eslint).
- **Dependencies:** `next@16.2.12`, `react@19.2.4`, `react-dom@19.2.4`, `lucide-react`, `clsx`, `tailwind-merge`. Dev: `tailwindcss@^4`, `@tailwindcss/postcss`, `typescript`, `eslint`, `eslint-config-next`, type packages.
- **Notes:** No testing, formatting, or typecheck scripts. No `@types/tailwindcss` — Tailwind v4 does not need it. No frontend state/query library.

#### `next.config.ts`

- **Purpose:** Next.js configuration.
- **Security headers:** Sets `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `X-DNS-Prefetch-Control` on all routes; removes `X-Powered-By`.
- **Caching:** Long-term `immutable` cache for `/_next/static/*`; 30-day cache for `/next/image`. `minimumCacheTTL` set to 30 days for remote images.
- **Images:** Remote patterns allow **any** host over http/https; formats avif/webp; custom device/image sizes.
- **Rewrites:** `/uploads/:path*` → `http://localhost:8000/uploads/:path*` (hardcoded dev host — a production deployment would need this configurable).
- **Compiler:** strips `console.*` in production builds.
- **Used by:** the build toolchain. **Dependencies:** nothing internal.
- **Possible issues:** `hostname: '**'` for image remote patterns is very permissive; the uploads rewrite hardcodes localhost; no `output: 'standalone'` (relevant for containerized deployment).

#### `tsconfig.json`

- Strict TypeScript; `@/*` → `./src/*` path alias; `moduleResolution: bundler`; includes `.next/types`. Standard Next.js config. **Used by:** all frontend code.

#### `tailwind.config.ts`

- Extends theme with the brand palette (`dark #11100E`, `burgundy #5D1C34`, `gold #A67D45`, `sage #899581`, `beige #CDBBAD`, `bg #F0E9E3`), Inter/JetBrains Mono fonts, and fade-in/slide-up animations. Content globs cover `src/`. **Note:** most components use raw arbitrary values (`bg-[#5D1C34]`) instead of these theme tokens, so the config tokens are underused.

#### `postcss.config.mjs`

- Loads `@tailwindcss/postcss` (Tailwind v4 CSS-first setup). Pair with `@import "tailwindcss"` in `globals.css`.

#### `eslint.config.mjs`

- ESLint 9 flat config composing `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. **Used by:** `npm run lint`.

#### `docker-compose.yml`

- Defines three services: `db` (postgres:16-alpine, user/pass/db `iotmart`, port 5432, healthcheck), `api` (builds `./backend`, sets `DATABASE_URL`, `SECRET_KEY`, `DEBUG`, mounts `./backend:/app`, port 8000), `web` (builds `.`, env `NEXT_PUBLIC_API_URL`/`API_INTERNAL_URL`, mounts project, port 3000). Named volume `postgres_data`.
- **Concerns:** hardcoded dev DB credentials; dev-only configuration; `web` runs `npm run dev` (see `Dockerfile.web`), not a production build; no production profile, no secrets management, no volumes for uploads (backend uploads dir is in the bind-mounted source).

#### `Dockerfile.web`

- `node:20-alpine`; `npm ci`; copies source; runs `npm run dev`. **Development-only.** Not suitable for production.

#### `Dockerfile` (in `backend/`)

- `python:3.12-slim`; pip-installs `requirements.txt`; runs `uvicorn main:app --reload`. Development-oriented (`--reload`, no `--workers`).

#### `.env.example` / `.env` / `.env.local`

- `.env.example` documents all variables (DB, JWT, SMTP, OTP, frontend URLs). `.env` contains local values. `.env.local` contains `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (NextAuth placeholder values that are **not used by any code** — dead config). Both are gitignored.

#### `.gitignore`

- Ignores env files (keeps examples), `.next`, node_modules, Python caches, uploads, logs, OS/IDE files. Good hygiene.

#### `AGENTS.md` / `CLAUDE.md`

- Agent rules pointing agents to `node_modules/next/dist/docs/` for this Next.js version's breaking changes. `CLAUDE.md` imports AGENTS.md.

#### `README.md`

- Untouched create-next-app boilerplate; does not describe the project, setup, or architecture. **Improvement:** document the real setup (docker-compose, env, migrations).

#### `DATABASE_AUDIT.md`

- A prior 43KB database-focused audit. Complementary to this document.

### 3.2 Backend infrastructure

#### `backend/main.py`

- **Purpose:** FastAPI app entrypoint.
- **Responsibilities:** lifespan (best-effort `Base.metadata.create_all` on startup), CORS (allows only `http://localhost:3000`), rate-limit handler wiring, router registration (13 routers), static mount of `/uploads`, and `GET /api/health`.
- **Imports:** all routers, engine/Base, limiter.
- **Used by:** uvicorn. **Depends on:** every router and app module.
- **Possible issues:** auto-`create_all` on startup conflicts with Alembic migrations (two sources of schema truth; several migrations even use `IF NOT EXISTS` because of it). `create_all` also does not run in Docker reliably if DB is down (gracefully caught). CORS origin list is hardcoded to one dev origin.

#### `backend/app/config.py`

- **Purpose:** Typed settings from environment variables via pydantic-settings.
- **Key settings:** `database_url`, `secret_key`, `algorithm` (HS256), `access_token_expire_minutes` (default 43200 = **30 days**), `refresh_token_expire_days` (30), `debug`, `environment`, SMTP block, OTP block (expire 5 min, max 5 attempts).
- **Improvement:** `secret_key` has an insecure default ("change-me-...") — fine for dev, but production can silently boot with a weak key if the env is missing.

#### `backend/app/database.py`

- **Purpose:** Async SQLAlchemy engine (`pool_pre_ping=True`), `async_sessionmaker` session factory, `Base` declarative base, and the `get_db` FastAPI dependency (commit on success, rollback on exception).
- **Used by:** every router and service via `Depends(get_db)`.

#### `backend/app/security.py`

- **Purpose:** Password hashing (bcrypt via passlib) and JWT handling.
- **Main functions:** `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token`, `decode_token`, `get_current_user`, `get_current_admin`.
- **Token claims:** `sub` (user UUID), `exp`, `type` (`access`/`refresh`). Access tokens last 30 days by default.
- **Dependencies:** `get_current_user` hits the DB each request (validates the user still exists and is active). `get_current_admin` checks `role == "admin"`.
- **Used by:** all routers requiring auth.
- **Possible issues:** access token TTL of 30 days is long (no revocation except DB user check); no `iss`/`aud` claims; `decode_token` raises 401 for both invalid and expired tokens (fine).

#### `backend/app/limiter.py`

- **Purpose:** Single shared `slowapi.Limiter` instance keyed by remote address, defined here to avoid circular imports.
- **Used by:** auth router (`@limiter.limit(...)`).

#### `backend/app/email_service.py`

- **Purpose:** Email sending without blocking the event loop.
- **Main functions:** `generate_otp` (crypto-random 6 digits), `hash_otp`/`verify_otp` (bcrypt), `send_otp_email`, `send_new_order_email`, `send_contact_email`, plus sync SMTP helpers run via `run_in_executor`.
- **Behavior:** If `smtp_host` is empty, emails are printed to stdout (dev mode); OTP response exposes `dev_otp` when SMTP is off. HTML templates are hand-written f-strings with brand styling.
- **Possible issues:** SMTP failures are logged but not surfaced to the client for OTP (by design, but means a misconfigured SMTP silently breaks registration in production while still exposing `dev_otp` if `smtp_host` is blank). New-order/contact emails are fire-and-forget with no retry/queue.

### 3.3 Backend models (`backend/app/models/models.py`)

All 15 tables are defined here — see Section 7 for full details. Models use UUID primary keys, `utcnow()` timestamps, JSONB for flexible arrays/dicts, and SQLAlchemy 2.0 typed `Mapped`/`mapped_column` style. This file is the schema source for both `create_all` and Alembic.

### 3.4 Backend schemas (`backend/app/schemas/`)

Pydantic v2 models. Notable:
- **`auth.py`** — `OTPRequest`, `OTPVerify`, `OTPRequestOut` (with optional `dev_otp`), `OTPVerifyOut`, `RegisterWithOTP`, `UserLogin`, `UserOut`, `TokenOut`, `UserUpdate`.
- **`products.py`** — `ProductCreate`/`ProductUpdate`/`ProductOut` (nested Category/Brand/Reviews), `ProductListOut` (paginated), `ReviewCreate`/`ReviewOut`.
- **`catalog.py`** — Category and Brand schemas (CategoryOut carries `product_count`).
- **`tutorials.py`** — Tutorial CRUD + category schemas.
- **`orders.py`** — `OrderCreate` (items + shipping address + payment method), `OrderStatusUpdate`, `OrderOut`.
- **`cms.py`** — CMSPage CRUD schemas (blocks are untyped `list`).
- **`analytics.py`** — tracking/heartbeat requests + dashboard response schemas.

**Issue:** several schemas validate weakly (e.g., `OrderCreate.items[].price` and `subtotal` are trusted from the client; `ProductCreate.price` accepts negative values; `ReviewCreate.rating` has no 1–5 constraint).

### 3.5 Backend routers

All routers follow the same pattern: `APIRouter`, `Depends(get_db)`, public reads, admin-guarded writes. See Sections 5 and 6 for per-endpoint detail.

- **`auth.py` (358 lines)** — OTP registration flow + login/refresh/logout/me. Rate limited on the three OTP steps. **The most security-sensitive file.**
- **`users.py`** — Admin list/get/delete; PATCH allows self-or-admin.
- **`categories.py`** — Public list (with product counts) and get; admin CRUD.
- **`brands.py`** — Public list/get; admin CRUD.
- **`products.py`** — Public filtered list (category, brand, search via `ilike`, price range, featured, in-stock; pagination up to 500/page), get by id/slug, admin CRUD, authenticated `POST /{id}/reviews` (recalculates product rating).
- **`tutorials.py`** — Public list/filter/get (GET increments `views`), admin CRUD + tutorial category CRUD.
- **`orders.py`** — Create (auth), list (own or all for admin), get (own or admin), cancel own pending order, admin status update.
- **`cms.py`** — Public page list/get; admin CRUD.
- **`upload.py`** — Admin-only image upload; validates content-type (JPEG/PNG/WebP/GIF) and 5 MB cap; stores under `backend/public/uploads/<uuid>.<ext>`.
- **`reviews.py`** — Admin list/filter, toggle verified, delete (recalculates rating).
- **`settings.py`** — Public GET (merged defaults + saved) and admin PUT for site settings (store info, shipping, tax, notification toggles).
- **`contact.py`** — Public POST (persists + notifies admin) and admin list/mark-read/delete.
- **`analytics.py`** — Public POST track/heartbeat (204); admin GET summary/dashboard/top-pages/devices/browsers/countries/trend.

### 3.6 Backend services (`backend/app/services/analytics_service.py`)

- **Purpose:** All analytics DB operations.
- **Main functions:** `should_skip` (bot UA regex + path allowlist), `hash_ip` (SHA-256 with a static salt), `make_visitor_id`, `record_page_view`, `upsert_online_visitor`, `prune_online_visitors` (TTL 5 min), `update_duration`, and aggregation queries (`get_summary`, `get_top_pages`, device/browser/country breakdowns, `get_daily_trend`).
- **Possible issues:** static salt means hashed IPs are deterministic (still one-way, but re-identifiable if IPs are brute-forced); `page_views` grows unbounded with no retention job; no GeoIP configured (country/city always null); background tasks open their own sessions.

### 3.7 Backend migrations (`backend/migrations/`)

- **`alembic.ini`** — script location, async URL override in `env.py` from settings.
- **`env.py`** — async Alembic environment importing `Base.metadata`.
- **Versions (6):** `a65fa1e49e33` initial (no-op), `db6006ec09bd` brand_id nullable, `c1a2b3d4e5f6` email_pending_verifications, `a1b2c3d4e5f6` analytics tables, `f1a2b3c4d5e6` customer_email on orders, `740f602fcdfd` drop tax column from orders.
- **Note:** migration chain reflects an evolving schema (tax dropped, brand nullable, analytics added).

### 3.8 Backend tests (`backend/tests/`)

- **`conftest.py`** — adds `backend/` to sys.path.
- **`test_otp_flow.py` (538 lines)** — Mocked-DB/DB-agnostic tests of the OTP request/verify/register flow and token behavior using `TestClient` with patched email/DB.
- **`test_analytics.py` (268 lines)** — Unit tests for `should_skip`, IP hashing, UA parsing, and analytics helpers.
- **Coverage:** auth OTP + analytics only. No tests for products, orders, users, CMS, reviews, settings, contact, upload, or security deps.

### 3.9 Frontend infrastructure (`src/lib/`)

#### `api.ts` (290 lines)

- **Purpose:** The single typed API client for the whole frontend.
- **Design:** `apiFetch<T>` chooses base URL by environment: server/RSC → `API_INTERNAL_URL` directly; browser → relative `/api/*` (through the Next proxy). Defaults `cache: "no-store"`. Reads `err.detail` on failure.
- **Exports:** grouped API objects — `authApi`, `categoriesApi`, `brandsApi`, `productsApi`, `tutorialsApi`, `ordersApi`, `usersApi`, `reviewsApi`, `contactApi`, `settingsApi`, `uploadApi`, `cmsApi`, `analyticsApi`. Plus filter interfaces.
- **Used by:** nearly every page and component.
- **Possible issues:** heavy use of `any` in return types (type safety weakened); `Content-Type` always set to JSON (fine except FormData upload which overrides headers); no automatic token refresh / 401 handling.

#### `customerAuth.ts` / `adminAuth.ts`

- **Purpose:** Client-side auth state. Two nearly identical files (30-day TTL for customers, 24-hour for admins).
- **Pattern:** `localStorage` keys `customer_token`/`customer_user`/`customer_login_time` (or `admin_*`). A `use*Auth()` hook hydrates on mount, clears expired sessions, and polls expiry every 60 seconds. Plain getters `getCustomerToken()`/`getAdminToken()` for non-hook call sites.
- **Used by:** checkout/login/register/profile (customer), admin layout + admin pages (admin).
- **Possible issues:** tokens live in localStorage (XSS-exposed); session expiry is purely client-side bookkeeping — the JWT itself may still be valid server-side; no refresh-token flow on the frontend (the refresh cookie is set but never used by the client).

#### `seo.ts` (432 lines)

- **Purpose:** Metadata and JSON-LD generators.
- **Functions:** `canonicalUrl`, `generatePageMetadata`, `generateProductMetadata`, `generateTutorialMetadata`, and JSON-LD builders (`organizationJsonLd`, `webSiteJsonLd`, `productJsonLd`, `reviewJsonLd`, `tutorialArticleJsonLd`, `tutorialHowToJsonLd`, `faqPageJsonLd`, `breadcrumbJsonLd`, `productListJsonLd`, `tutorialListJsonLd`, `jsonLdString`).
- **Used by:** layout, homepage, products, tutorials, about, faq, and detail pages.

#### `cms-store.ts` (317 lines)

- **Purpose:** In-memory CMS page store + the full block type system.
- **Contents:** `BlockType` union (14 types), per-type interfaces, `BLOCK_DEFAULTS`, `BLOCK_META`, 7 seeded pages (Home, About, FAQ, Contact, Privacy, Shipping, New Page), and CRUD functions (`getPages`, `getPageById`, `savePage`, `deletePage`, `createPage`).
- **Used by:** admin pages list + page builder.
- **Possible issues:** in-memory only — page changes vanish on reload if the backend save fails; seed pages duplicate what static storefront pages already render.

#### `utils.ts` (169 lines)

- **Purpose:** Shared helpers — `cn` (clsx+twMerge), currency/price formatting (`Rs.`), discount %, cart math (`calculateSubtotal/Shipping/Total`), `slugify`, `truncate`, dates, rating labels, pagination, order-number generator, email/phone validation, shuffle/unique, number formatting.
- **Used by:** many pages/components.

#### `constants.ts` (146 lines)

- **Purpose:** Site metadata (`SITE_NAME`, `SITE_URL`, `SITE_DESCRIPTION` from env), currency (`CURRENCY="NPR"`, symbol `Rs.`), shipping constants, color palette, sort options, status color maps, nav links, footer links, admin nav.

### 3.10 Frontend state, types, data

#### `src/context/CartContext.tsx`

- **Purpose:** Global cart via React context + reducer, persisted to `localStorage` under `iotmart-cart`.
- **API:** `useCart()` → `{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, subtotal }`.
- **Used by:** Navbar (badge), cart page, product cards, product detail.
- **Notes:** guest-only cart; no server sync; quantity increments merge by product id.

#### `src/types/index.ts`

- TypeScript interfaces for Category, Brand, Product, ProductReview, Tutorial, TutorialCategory, CartItem, Order/OrderStatus/ShippingAddress, User, Banner, filters, and analytics types. These mirror backend schemas but use camelCase, requiring snake_case→camelCase normalization in components.

#### `src/data/products.ts`, `tutorials.ts`, `categories.ts`, `orders.ts`

- Large static datasets (e.g., ~40 products, tutorials, orders, banners) used by the admin dashboard and the two mock admin pages. Not used by the customer storefront (which is API-driven).

### 3.11 Frontend routes

#### Catch-all proxy — `src/app/api/[...path]/route.ts`

- **Purpose:** Proxies browser requests to FastAPI. Reads `API_INTERNAL_URL`/`NEXT_PUBLIC_API_URL`, forwards method/headers/body/cookies, returns the backend response (stripping `transfer-encoding`/`connection`). Returns `502 {error: "API unreachable"}` if the backend is down.
- **Used by:** every client-side API call.
- **Depends on:** the FastAPI backend at localhost:8000.

#### Root `layout.tsx`

- Global metadata (title template, description, keywords, OG/Twitter, canonical), `Inter` font, `<html lang="en">`, skip-link, `WebVitals`, `CartProvider`, and Organization + WebSite JSON-LD.

#### `error.tsx`, `loading.tsx`, `not-found.tsx`

- Root error boundary (with dev-only error details + reset), full-page branded loading spinner, and an accessible 404 with search box and links. `not-found.tsx` sets `robots: noindex`. The `(customer)` route group also ships its own `error.tsx` (see Section 9) so storefront errors are caught closer to the failing page and rendered within the customer layout (Navbar/Footer preserved).

#### `robots.ts`, `sitemap.ts`

- `robots.ts` allows all but `/admin`, `/admin/`, `/api/`; references sitemap. `sitemap.ts` builds static + dynamic (products, tutorials) URLs by querying the API; failures are non-fatal.

### 3.12 Customer pages — see Section 9 for detail

All under `src/app/(customer)/`:

| Route | Type | Purpose |
|---|---|---|
| `/` `page.tsx` | Server | Homepage: hero, categories, featured products/tutorials, newsletter |
| `/products` | Server | Filterable product listing + pagination + ItemList JSON-LD |
| `/products/[slug]` | Server | Product detail: gallery, pricing, specs, reviews, related |
| `/products/loading.tsx` | Server | Skeleton loading UI |
| `/search` | Server | Combined product + tutorial search (`?q=`) |
| `/tutorials` | Server | Tutorial listing with filters + pagination |
| `/tutorials/[slug]` | Server | Tutorial detail: wiring, steps, code, related items |
| `/tutorials/loading.tsx` | Server | Skeleton loading UI |
| `/cart` | Client | Cart with qty steppers, free-shipping progress, summary |
| `/checkout` | Client | 3-step COD checkout (shipping → review → confirmation) |
| `/login` | Client | Customer login |
| `/register` | Client | 3-step OTP registration |
| `/profile` | Client | Account dashboard (orders, settings, placeholders) |
| `/about` | Server | Static about page + Organization JSON-LD |
| `/contact` | Client | Contact form + store info |
| `/faq` | Server + `FAQClient` | FAQ accordion + FAQPage JSON-LD |
| `/privacy`, `/shipping`, `/returns` | Server | Static policy pages |
| `layout.tsx` | Server | Navbar + Footer + AnalyticsBeacon shell |

### 3.13 Admin pages — see Section 10 for detail

All under `src/app/admin/`:

| Route | Type | Purpose |
|---|---|---|
| `layout.tsx` | Client | Admin shell: auth gate, sidebar, login modal |
| `page.tsx` | Server | Dashboard — **mock data** from `@/data/orders` |
| `products` | Server | Product table (search/category/pagination, delete) |
| `products/new` | Client | Create product form |
| `products/[id]` | Client | Product detail + delete |
| `products/[id]/edit` | Client | Edit product form |
| `products/categories` | Client | Category CRUD — **mock, local-only** (does not hit API) |
| `categories` | Client | Category CRUD — **real API** (this is the one the sidebar links to) |
| `brands` | Client | Brand CRUD — real API |
| `orders` | Client | Order list with status tabs + search |
| `orders/[id]` | Client | Order detail + status updater |
| `customers` | Client | Customer table (search, role filter) |
| `tutorials` | Client | Tutorial list (search/difficulty) |
| `tutorials/new` | Client | Create tutorial form |
| `tutorials/[id]/edit` | Client | Edit/delete tutorial |
| `tutorials/categories` | Client | Tutorial category CRUD — real API |
| `reviews` | Client | Review moderation (verify/delete) |
| `banners` | Client | Banner CRUD — **mock, local-only** |
| `analytics` | Client | Analytics dashboard (6 API endpoints) |
| `settings` | Client | Store/shipping/notifications/security settings |
| `pages` | Client | CMS page list (local store + best-effort API) |
| `pages/[id]/edit` | Client | Visual page builder |

### 3.14 Components — see Section 8 for detail

Organized under `src/components/`: `admin/` (11 files incl. the CMS builder pieces), `layout/` (Navbar, Footer, NewsletterForm), `product/` (ProductCard, ProductFiltersPanel, ProductGallery, AddToCartSection, WriteReviewForm), `profile/` (5 panels), `tutorial/` (CodeBlock, TutorialCard), `ui/` (13 primitives), plus root-level `AnalyticsBeacon.tsx` and `WebVitals.tsx`.

---

## 4. Application Workflow

### End-to-end flow (product listing → order)

```
Browser
   ▼
1. User opens /products
   ▼
2. Next.js Server Component renders. apiFetch() runs on the server with
   BASE = API_INTERNAL_URL → GET http://localhost:8000/api/products?category=...
   ▼
3. Next.js catch-all proxy is NOT used here (server-side direct call).
   The fetch hits FastAPI directly (inside Docker: http://api:8000).
   ▼
4. FastAPI products router
   ▼
5. SQLAlchemy async query with selectinload(category, brand, reviews) + filters
   ▼
6. PostgreSQL executes query
   ▼
7. Pydantic ProductListOut serializes (nested category/brand/reviews)
   ▼
8. JSON returns to the Server Component; HTML + JSON-LD (ItemList) rendered
   ▼
9. Browser receives SSR HTML; hydration; AnalyticsBeacon fires POST /api/analytics/track
   ▼
10. Client-side navigation to /products/[slug] (RSC again, same direct path)
   ▼
11. User clicks "Add to Cart" → ProductCard/AddToCartSection → CartContext
   ▼
12. Cart persists to localStorage("iotmart-cart"); Navbar badge updates
   ▼
13. User checks out at /checkout (Client Component)
   ▼
14. Client fetch POST /api/orders  →  Next.js /api/[...path] proxy route
   ▼
15. Proxy forwards to FastAPI http://localhost:8000/api/orders (cookies/headers pass through)
   ▼
16. orders.create_order: reads shipping settings, computes subtotal/shipping/total,
    creates Order row, fires background send_new_order_email to store email
   ▼
17. Response returns through the proxy → order confirmation screen; cart cleared
   ▼
18. Admin later PATCHes /api/orders/{id}/status → "delivered" (payment marked paid)
   ▼
19. Customer sees order status in /profile → OrderHistoryPanel
```

### Where each layer lives

| Step | Layer | Location |
|---|---|---|
| 1–2, 9–10 | Frontend render | `src/app/(customer)/products/*` |
| 3, 14–15 | Gateway | `src/lib/api.ts` + `src/app/api/[...path]/route.ts` |
| 4, 7, 16 | Business logic + API | `backend/app/routers/products.py`, `orders.py` |
| 5, 17 | Data access | `backend/app/database.py`, `backend/app/models/models.py` |
| 6 | Storage | PostgreSQL (docker-compose `db`) |
| 11–13 | Client state | `src/context/CartContext.tsx` |

---

## 5. Request Flow — API Reference

Unless noted, read endpoints are public and write endpoints require admin. Auth token goes in `Authorization: Bearer <access_token>`.

### `GET /api/health`
- **Method:** GET, public.
- **Response:** `{"status":"ok","service":"iotmart-api"}`.
- **Error handling:** always 200 if app is up.

### Auth — `POST /api/auth/*` (see Section 6 for full flow)
- `POST /api/auth/request-otp` — rate limited 10/hour. Input `{email}`. Business logic: reject if email registered; generate OTP, upsert pending row, email it. Response `{message, dev_otp?}` (dev_otp only when SMTP off).
- `POST /api/auth/verify-otp` — rate limited 20/hour. Input `{email, otp}`. Validates pending row (exists/used/expired/attempts), increments attempts before verify, returns short-lived `verification_token` (type `email_verified`, expiry = OTP expiry + 2 min).
- `POST /api/auth/register` — rate limited 10/hour. Input `{name, email, password, verification_token}`. Decodes token, checks type + email match, duplicate guard, creates user, deletes pending row, issues access token + refresh cookie. 201.
- `POST /api/auth/login` — **no rate limit.** Input `{email, password}`. Verifies password + active; issues tokens + refresh cookie.
- `POST /api/auth/refresh` — reads `refresh_token` cookie; validates type; rotates tokens.
- `POST /api/auth/logout` — clears refresh cookie.
- `GET /api/auth/me` — auth required; returns current user.
- `PATCH /api/auth/me` — auth required; updates name/phone/avatar/address/password (password re-hashed).

### Categories & Brands
- `GET /api/categories` — public; returns all with `product_count` (computed by group-by query).
- `GET /api/categories/{slug}` — public; 404 if missing.
- `POST/PUT/DELETE /api/categories` (+`/{id}`) — admin; slug uniqueness check on create.
- `GET /api/brands` / `GET /api/brands/{slug}` — public.
- `POST/PUT/DELETE /api/brands` (+`/{id}`) — admin.

### Products
- `GET /api/products` — public; query params `category` (slug), `brand` (slug), `search` (ilike name/description), `min_price`, `max_price`, `featured`, `in_stock`, `page` (≥1), `page_size` (1–500, default 20). Returns `{items, total, page, page_size}` with category/brand/reviews eagerly loaded. Order by `created_at desc`.
- `GET /api/products/id/{id}` — public; by UUID.
- `GET /api/products/{slug}` — public; by slug.
- `POST /api/products` — admin; slug uniqueness guard; 201.
- `PUT /api/products/{id}` — admin; partial update via `exclude_none`.
- `DELETE /api/products/{id}` — admin; 204.
- `POST /api/products/{id}/reviews` — **authenticated user**; creates review (denormalizes user_name/avatar), increments `review_count`, recomputes `rating` from all reviews. 201.
- **Error handling:** 404 unknown id/slug; 400 duplicate slug; auth dependencies return 401/403.
- **Issues:** `search` uses leading-wildcard `ilike` (no index benefit); review rating not range-validated; listing loads full reviews for every row in a page.

### Tutorials
- `GET /api/tutorials` — public; filters `category` (slug), `difficulty`, `featured`, `published`, `search`; pagination like products.
- `GET /api/tutorials/{slug}` — public; **increments `views` on every GET** (no dedup).
- `POST/PUT/DELETE /api/tutorials` (+`/{id}`) — admin.
- `GET /api/tutorials/categories` — public; `POST/PUT/DELETE /api/tutorials/categories` (+`/{id}`) — admin.

### Orders
- `GET /api/orders` — auth; admin sees all, customer sees own.
- `GET /api/orders/{id}` — auth; admin or owner.
- `POST /api/orders` — auth. **Business logic:** reads `shipping_free_threshold`/`shipping_default_cost` from SiteSettings (defaults 5000/100); `subtotal` = sum of **client-provided** item subtotals; `shipping = 0 if subtotal ≥ threshold else default_cost`; `total = subtotal + shipping`; payment_status `pending`; fires background admin email. 201.
- `PATCH /api/orders/{id}/cancel` — auth; **owner only**; only `pending` orders cancellable.
- `PATCH /api/orders/{id}/status` — admin; valid statuses `pending|processing|delivered|cancelled` (note: **not** `shipped`/`refunded`, which exist in the DB enum); sets `payment_status=paid` when delivered.
- **Critical issue:** order totals trust client-sent prices/subtotals — a client can place an order with arbitrary amounts. Stock is never checked or decremented.

### Reviews (admin)
- `GET /api/reviews` — admin; filter `verified`, `search` (user_name).
- `PATCH /api/reviews/{id}/verify` — admin; toggles verified.
- `DELETE /api/reviews/{id}` — admin; recomputes product rating/count.

### CMS
- `GET /api/cms/pages` — public; list with block_count.
- `GET /api/cms/pages/{id}` / `GET /api/cms/pages/slug/{slug}` — public.
- `POST/PUT/DELETE /api/cms/pages` (+`/{id}`) — admin.

### Upload
- `POST /api/upload` — **admin**; multipart file; validates `content_type` ∈ {jpeg,png,webp,gif} and ≤ 5 MB; writes to `backend/public/uploads/<uuid><ext>`; returns `{url: "/uploads/<file>"}`.

### Settings
- `GET /api/settings` — public; merged defaults + saved rows (store info, shipping, tax_rate, notify toggles).
- `PUT /api/settings` — admin; upserts arbitrary keys.

### Contact
- `POST /api/contact` — public; validates message ≥ 10 chars; persists + fires admin email.
- `GET /api/contact`, `PATCH /api/contact/{id}/read`, `DELETE /api/contact/{id}` — admin.

### Analytics
- `POST /api/analytics/track` — public; skips bots/admin/api paths; hashes IP; records PageView; returns 204 with `X-Session-Id`; background upsert + prune of online visitors.
- `POST /api/analytics/heartbeat` — public; extends online presence; optional duration update.
- `GET /api/analytics/summary|dashboard|top-pages|devices|browsers|countries|trend` — **admin only**.

---

## 6. Authentication Flow

### Roles
- `customer` (default) and `admin`, stored in `users.role` as a Postgres enum. Role checks are server-side via `get_current_admin`.

### Registration (OTP-gated, 3 steps)
1. `POST /auth/request-otp` — rate-limited; rejects already-registered emails; stores a bcrypt-hashed OTP in `email_pending_verifications` (one row per email, upserted); emails the code (console in dev). `dev_otp` returned only when SMTP is unset.
2. `POST /auth/verify-otp` — 20/hour; enforces: exists, not used, not expired (5 min), attempts < 5. Attempts increment **before** verification (anti-timing-oracle). Success returns a short-lived JWT (`type=email_verified`, sub=email).
3. `POST /auth/register` — 10/hour; validates token type + email match; duplicate race-guard; creates user; deletes pending row; issues tokens. **A user can only be created after proving email ownership.**

### Login
- `POST /auth/login` with email + password; bcrypt verify; active check. Issues:
  - **Access token** (JWT HS256, `sub`=user id, `exp`=30 days, `type=access`) — returned in JSON, stored by the frontend in **localStorage**.
  - **Refresh token** (JWT, `type=refresh`, 30 days) — set as an **httpOnly cookie** (`refresh_token`, SameSite=Lax, Secure in production).

### Session
- Frontend `useCustomerAuth`/`useAdminAuth` manage a client-side TTL (30 days / 24 hours) in localStorage with a 60-second expiry poll. The httpOnly refresh cookie exists but the frontend **never calls `/auth/refresh`** — sessions live or die by localStorage + JWT expiry.

### Authorization & protected routes
- Server: `get_current_user` (any authenticated user) and `get_current_admin` (role check) on FastAPI dependencies.
- Frontend: admin is gated **only in the client layout** (`/admin/layout.tsx` renders `AdminLoginModal` when no token). There is **no middleware** — the admin route group is fetchable as a server-rendered route group, and some admin pages (dashboard, products list, tutorials list) are server components that fetch public data without auth. Actual write/delete operations are re-checked server-side.
- Customer pages redirect to `/login?redirect=...` when unauthenticated (checkout, profile).

### Missing pieces
- **No password reset / forgot-password flow** (login page has a dead `#` link).
- No email verification for password changes.
- No refresh-token rotation on the frontend.
- No login rate limiting (only OTP endpoints are limited).
- No account lockout beyond OTP attempts.
- Social login buttons are non-functional placeholders.

---

## 7. Database Design

PostgreSQL 16. All PKs are UUIDs (client-generated `uuid.uuid4` in SQLAlchemy). Timestamps are timezone-aware UTC. JSONB stores arrays/dicts (images, tags, specs, blocks, cart-like item lists). Enums are native Postgres enums for role, order_status, payment_status, page_status, difficulty_level.

### Tables

**`users`** — Account records.
- Columns: `id` UUID PK, `name`, `email` (unique, indexed), `hashed_password`, `role` enum(customer|admin, default customer), `avatar` text?, `phone`, `address` JSONB?, `is_active` bool, `created_at`/`updated_at`.
- Relationships: 1–N → `orders`, 1–N → `product_reviews`.
- CRUD: created in register; read via `/auth/me`, admin `/users`; update via `/auth/me` or admin PATCH; delete admin-only.

**`categories`** — Product categories.
- Columns: `id`, `name`, `slug` (unique, indexed), `description`, `image`, `created_at`.
- 1–N → `products`. CRUD: admin; read public.

**`brands`** — Product brands.
- Columns: `id`, `name`, `slug` (unique, indexed), `logo`, `created_at`.
- 1–N → `products` (nullable FK). CRUD: admin.

**`products`** — Product catalog.
- Columns: `id`, `name`, `slug` (unique, indexed), `sku` (unique), `description`, `short_description`, `price` float, `original_price`?, `currency`, `images` JSONB, `tags` JSONB, `specs` JSONB, `stock` int, `rating` float, `review_count` int, `featured`/`new_arrival`/`best_seller`/`in_stock` bools, `weight`?, `dimensions`?, `related_product_ids` JSONB, `category_id` FK→categories, `brand_id` FK→brands (nullable), timestamps.
- Relationships: N–1 → category/brand; 1–N → reviews (cascade delete).
- Indexes: slug, sku (unique); **no index on `category_id`, `brand_id`, `price`, or `featured`** — the main listing filters rely on a sequential scan at scale.
- CRUD: admin; public reads; rating recomputed on review add/delete.

**`product_reviews`** — Product reviews.
- Columns: `id`, `product_id` FK (ondelete CASCADE), `user_id` FK (CASCADE), `user_name` (denormalized), `user_avatar`?, `rating` int, `title`, `body`, `verified` bool (default false — moderation flag), `created_at`.
- Indexed by the two FKs. CRUD: customer create; admin verify/delete; public read (embedded in product).

**`tutorial_categories`** — Tutorial category.
- Columns: `id`, `name`, `slug` (unique, indexed), `description`, `icon`, `created_at`. 1–N → tutorials.

**`tutorials`** — Tutorial content.
- Columns: `id`, `title`, `slug` (unique, indexed), `description`, `short_description`, `difficulty` enum(Beginner/Intermediate/Advanced), `estimated_time`, `components`/`sensors`/`microcontrollers` JSONB, `circuit_diagram`?, `wiring_instructions` JSONB, `source_code` text, `code_language`, `steps`/`prerequisites`/`learning_outcomes` JSONB, `related_product_ids`/`related_tutorial_ids` JSONB, `cover_image`, `views` int, `featured`, `published`, `author`, `tags` JSONB, `category_id` FK, timestamps.
- CRUD: admin; public reads; `views` incremented on GET.

**`orders`** — Customer orders.
- Columns: `id`, `order_number` (unique, indexed; format `ORD-XXXXXXXX`), `user_id` FK (nullable, ondelete SET NULL), `customer_email` (indexed, nullable), `items` JSONB (denormalized product snapshot), `shipping_address` JSONB, `status` enum(pending|processing|shipped|delivered|cancelled|refunded, default pending), `subtotal`, `shipping_cost`, `total` floats, `payment_method`, `payment_status` enum(pending|paid|failed|refunded), `notes`?, timestamps.
- **No tax column** (dropped by migration `740f602fcdfd`).
- CRUD: customer create/cancel-own; admin list/get/status. **No stock table** — order placement does not touch `products.stock`.

**`cms_pages`** — Content pages for the visual builder.
- Columns: `id`, `title`, `slug` (unique, indexed), `status` enum(published|draft), `blocks` JSONB (the block tree), timestamps.
- CRUD: admin; public reads. **Not consumed by the storefront** — static pages render instead.

**`contact_messages`** — Contact form submissions.
- Columns: `id`, `name`, `email`, `subject`, `message`, `read` bool, `created_at`. Admin list/read-toggle/delete; public create.

**`site_settings`** — Key/value store.
- Columns: `key` (PK), `value` text, `updated_at`. Public read, admin write. Keys include store info, `shipping_free_threshold`, `shipping_default_cost`, `shipping_processing_days`, `tax_rate`, `tax_id`, and notification toggles.

**`email_pending_verifications`** — OTP records.
- Columns: `id`, `email` (unique, indexed), `hashed_otp` (bcrypt), `expires_at`, `attempts`, `used`, `created_at`. One row per email (upserted on resend).

**`banners`** — Storefront banners.
- Columns: `id`, `title`, `subtitle`, `cta_text`, `cta_link`, `image`, `active`, `order`, `created_at`.
- **No router and no storefront consumer** — the admin banner page is mock/local; the table is currently unused dead schema.

**`page_views`** — Analytics page views.
- Columns: `id`, `visitor_id` (indexed, 32-hex SHA-256 of IP+UA), `session_id` (indexed), `ip_hash` (SHA-256, never raw), `path` (indexed), `referrer`, `user_agent`, `browser`, `browser_version`, `os`, `device_type`, `country`, `city`, `duration_ms`, `created_at` (indexed).
- Comments in code note intent to add composite `(created_at, visitor_id)` index for unique-visitor queries, but it is **not defined**.
- **No retention/aggregation** — rows accumulate forever.

**`online_visitors`** — Heartbeat presence.
- Columns: `session_id` PK, `visitor_id` (indexed), `path`, `last_seen` (indexed), `created_at`. Pruned every 5 minutes.

### Relationships summary

```
users 1──N orders (SET NULL)
users 1──N product_reviews
categories 1──N products
brands 1──N products (nullable)
products 1──N product_reviews (CASCADE)
tutorial_categories 1──N tutorials
```

### Concurrency & integrity notes
- Orders do **not** decrement stock; no row locks; two concurrent orders can oversell.
- `related_product_ids`/`related_tutorial_ids` are unvalidated JSONB arrays (dangling ids possible).
- Review rating recompute reads all reviews per product on every add/delete (O(n) per write).
- `create_all` on startup + Alembic both manage schema (migration files work around this with `IF NOT EXISTS`).

---

## 8. Component Flow

All interactive components are `"use client"`. Server-safe primitives (Badge, Breadcrumb, Button, Card, EmptyState, Input, PaginationLinks, Select, Skeleton, Textarea, TutorialCard, Footer, BlockPreview) have no directive.

### Shared UI primitives (`src/components/ui/`)
- **`Button`** — variants/sizes/loading/fullWidth. **Only used by EmptyState.** (The `as`/`href` prop that EmptyState passes is not implemented → EmptyState CTA links don't actually navigate.)
- **`Input`/`Select`/`Textarea`** — labeled form controls with error/hint/icon support; used across login/register/contact/checkout and many admin forms.
- **`Modal`** — native `<dialog>` with backdrop/escape close; used by admin category/banner/tutorial-category pages.
- **`StarRating`** — display or interactive; used by ProductCard and product detail.
- **`Badge`, `Breadcrumb`, `Card`, `EmptyState`, `Skeleton` (with `ProductCardSkeleton`/`TutorialCardSkeleton`), `Pagination` (unused client variant), `PaginationLinks` (used)** — presentational helpers.

### Layout (`src/components/layout/`)
- **`Navbar`** — sticky header; mobile menu; inline search (`router.push('/search?q=')`); cart badge from `useCart().totalItems` (caps at 99+); scroll shadow.
- **`Footer`** — brand block + 4 link columns + `NewsletterForm`; social links are dead `#`.
- **`NewsletterForm` / `HomeNewsletterForm`** — **frontend-only**; on submit show "Thanks for subscribing!" with no API call or persistence.

### Product (`src/components/product/`)
- **`ProductCard`** — card with badges, discount, rating, quick add-to-cart; normalizes snake_case API fields; wishlist heart is decorative (no handler). Used on home, `/products`, related-products.
- **`ProductFiltersPanel`** — URL-based filters (Link hrefs, no JS routing); merges current params; used on `/products`.
- **`ProductGallery`** — main image + thumbs + lightbox; pads image list to ≥4; used on product detail.
- **`AddToCartSection`** — qty stepper (max = stock, cap 99) + add-to-cart with success flash; used on product detail.
- **`WriteReviewForm`** — star rating + title/body; requires customer token; validation (rating/title required); used on product detail.

### Profile (`src/components/profile/`)
- **`ProfileSidebar`** — 7-section nav (dashboard, orders, addresses, payment, wishlist, rewards, settings) + logout; last four sections have **no implementation** on the page.
- **`ProfileWelcome`** — avatar/initials, stats row; reward points show "—".
- **`AccountOverview`** — recent orders + recent items panels.
- **`OrderHistoryPanel`** — expandable orders with cancel (pending only) and derived payment badge.
- **`AccountSettingsPanel`** — edit name/phone + change password via `authApi.updateMe`.

### Tutorial (`src/components/tutorial/`)
- **`TutorialCard`** (server) — cover, difficulty/category badges, time, views; normalizes API fields.
- **`CodeBlock`** — dark code block with copy-to-clipboard; no syntax highlighting.

### Admin (`src/components/admin/`)
- **`AdminSidebar`** — dark nav with collapsible groups; links categories→`/admin/categories`, brands→`/admin/brands`.
- **`AdminLoginModal`** — full-screen login overlay; rejects non-admin roles.
- **`DeleteProductButton`** — confirm + delete + `router.refresh()`.
- **`ImagePicker`** — upload (multipart, 5 MB) or URL add, reorder, cover labeling; used in product forms.
- **CMS builder suite** (`AddBlockPanel`, `BlockEditor`, `BlockPreview`, `ComponentTree`, `FigmaPropertiesPanel`, `InlineBlockEditor`, `RichTextEditor`) — see Section 10 (CMS).

### Analytics (`AnalyticsBeacon.tsx`, `WebVitals.tsx`)
- **`AnalyticsBeacon`** — mounted in customer layout; renders null. On each route change: `POST /api/analytics/track` `{path, referrer, session_id}` (fetch, keepalive). Every 30s and on `beforeunload`/`pagehide`: `navigator.sendBeacon` heartbeat `{session_id, path, duration_ms}`. Session id from `sessionStorage._iotmart_sid` (UUID). Skips `/admin`, `/api`, `/_next`.
- **`WebVitals`** — mounted in root layout; `useReportWebVitals` → `POST /api/vitals` only in production (fallback `console.log` in dev). **The `/api/vitals` backend route does not exist** → production reports currently 404 via the proxy.

---

## 9. Page Flow

### Homepage (`/`)
- Server component; ISR fetch (`revalidate: 60`) of categories, featured products (8), featured tutorials (3) via raw `fetch` to `API_INTERNAL_URL` (bypasses `api.ts`).
- SEO: static metadata + OG image; JSON-LD `WebPage` (linked to the root Organization/WebSite graph) + `ItemList` of the 8 featured products.
- States: sections hide on empty; no loading skeleton for these blocks (suspense only via route loading).

### Product listing (`/products`)
- Server; `searchParams` promise awaited. Filters → `productsApi.list(...)` + categories + brands in parallel. `no-store` caching.
- SEO: `generatePageMetadata`, canonical override, `ItemList` JSON-LD.
- States: `EmptyState` when no results; `products/loading.tsx` skeleton; pagination via `PaginationLinks` preserving filters.

### Product detail (`/products/[slug]`)
- Server; `params` promise awaited; `productsApi.get(slug)`; related products fetched (non-fatal).
- SEO: async `generateMetadata` → `generateProductMetadata`; JSON-LD `Product` + `BreadcrumbList`.
- States: `notFound()` on fetch error; falls back to the `(customer)/error.tsx` boundary on render errors.

### Search (`/search`)
- Server; parallel product + tutorial search on `?q=`; dynamic metadata title.
- States: three branches — empty query prompt, no-results, results with "view all" links.

### Tutorial listing / detail (`/tutorials`, `/tutorials/[slug]`)
- Same server pattern as products; category/difficulty filters; `ItemList` + `TechArticle` + `HowTo` + `BreadcrumbList` JSON-LD; `tutorials/loading.tsx` skeleton.

### Cart / Checkout / Login / Register / Profile / Contact / FAQ
- All client components (see Sections 4, 6, 11). Checkout and profile redirect unauthenticated users to login with a `redirect` param.
- **Dedicated `error.tsx` in the customer route group** — catches render/runtime errors for every storefront page (products, tutorials, cart, checkout, etc.) within the customer layout; dev-only error details + reset + "go home". Detail pages additionally use `notFound()`. The root error boundary remains as the last-resort fallback.

### Static pages (About, Privacy, Shipping, Returns)
- Pure server components with hardcoded content; static metadata (About also has Organization JSON-LD).

---

## 10. Admin Panel

The admin is a client-rendered route group behind `/admin/layout.tsx`, which shows `AdminLoginModal` until a 24-hour-localStorage admin session exists.

### Dashboard (`/admin`)
- **Mock data.** KPI cards, revenue bar chart, top products, recent orders all read `@/data/orders.ts`. Not wired to the real API or analytics.
- Server component — no auth check at the page level.

### Products
- **List** (`/admin/products`) — server; real API (public list); search/category filter; pagination (20/page); `DeleteProductButton` uses admin token.
- **New** (`/admin/products/new`) — client; categories/brands dropdowns (slug→id mapping), auto-slug, spec rows, validation; `ImagePicker` upload; creates via `productsApi.create`.
- **Detail** (`/admin/products/[id]`) — client; `getById` (UUID route); gallery, specs, reviews, flags; delete with confirm.
- **Edit** (`/admin/products/[id]/edit`) — client; hydrate + update/delete; slug/SKU read-only.

### Categories & Brands
- **`/admin/categories`** and **`/admin/brands`** — client; **real API CRUD**; these are what the sidebar links to.
- **`/admin/products/categories`** — client; **mock local-only** CRUD seeded from `@/data/categories`; not API-backed, not linked from the sidebar (duplicate/confusing).

### Orders
- **List** (`/admin/orders`) — client; fetches **all** orders (no pagination); status tabs + client-side search; payment "paid" derived from `status === "delivered"`.
- **Detail** (`/admin/orders/[id]`) — client; radio status updater (`pending/processing/delivered/cancelled`); derived payment display.

### Customers
- **List** (`/admin/customers`) — client; `usersApi.list(token)` then client-side role filter to `customer`.

### Tutorials
- **List** — client; fetches up to 200, client-side search/difficulty filter. **No auth token** (public endpoint).
- **New/Edit** — client forms; categories by id; edit fetches 200 then finds by id (no get-by-id admin path).
- **Categories** — client; full API CRUD with modals.

### Reviews
- Moderation queue: filter all/approved/pending, search, verify toggle, delete — all API-backed with token.

### Banners (`/admin/banners`)
- **Mock local-only** — seeded from `@/data/orders.ts`, no API, no persistence. The `banners` DB table is unused.

### Analytics (`/admin/analytics`)
- Client; 6 parallel API calls (summary, top-pages, devices, browsers, countries, trend(14d)); skeleton loading; zero-guard bar widths; "No GeoIP configured" country panel.

### Settings (`/admin/settings`)
- Tabs: Store / Shipping / Notifications / Security. Loads/saves via `settingsApi` (admin). Password change via raw `PATCH /api/auth/me`. Boolean toggles stored as `"true"/"false"` strings. UI mixes Rs. labels with USD defaults.

### CMS Pages (`/admin/pages`, `/admin/pages/[id]/edit`)
- **Pages list** — reads the in-memory `cms-store`; create/delete mutate local state and **fire-and-forget API calls without an auth token** (they would 401 server-side). Changes can silently diverge from the backend.
- **Page builder** — 3-panel editor:
  - **Left:** `ComponentTree` (collapsible block hierarchy, select).
  - **Center:** canvas. Non-container blocks render `InlineBlockEditor` (paragraphs → `RichTextEditor` with execCommand toolbar; headings/lists/tables/quotes/buttons/cover text → contentEditable; code → auto-sizing textarea; media → live preview). Containers (row/column/container) nest children with hover controls and an add-block picker.
  - **Right:** `FigmaPropertiesPanel` — per-block property sections (typography, dimensions, padding/margin grids, backgrounds, borders, shadows, image object-fit/overlay, child pickers, reorder, delete). `BlockEditor.tsx` is an alternate form-based editor that is **not wired in**.
  - **Preview mode:** renders `BlockPreview` (recursive server-safe renderer; note: `container` renders only its first child; `paragraph` uses `dangerouslySetInnerHTML`).
  - **Save:** local `savePage()` + best-effort `PUT /api/cms/pages/{id}` without token.
- **Notably:** the storefront **does not render CMS pages** — no route consumes `cmsApi.getBySlug`/`/api/cms/pages/slug/*`. The builder is effectively a standalone prototype.
- **Workflow note:** admin sidebar auto-collapses on the builder route to give it room.

---

## 11. Customer Side

- **Homepage** — hero video, category grid, featured products/tutorials, value props, newsletter (non-functional).
- **Product listing** — server-rendered facets (category/brand/search/price/in-stock) with URL-driven filtering and pagination.
- **Search** — dedicated `/search` page across products + tutorials.
- **Product detail** — gallery/lightbox, discount badge, stock indicator, add-to-cart, specs, reviews (+ write review for logged-in users), related products.
- **Cart** — localStorage-backed; qty steppers; free-shipping progress bar; sticky summary.
- **Checkout** — 3 steps (Shipping → Review/Place Order → Confirmation); **Cash on Delivery only**; requires login; validation on shipping fields; clears cart on success.
- **Payment** — none integrated; `payment_method="cod"`, `payment_status="pending"` (becomes `paid` only when admin marks order delivered).
- **Orders** — profile → OrderHistoryPanel: expandable order details, cancel while pending.
- **Profile** — dashboard/orders/settings implemented; addresses, payment methods, wishlist, rewards are **placeholders**.
- **Tutorials** — browse/filter; detailed guides with wiring tables, code, and "shop components" cross-links.
- **Reviews** — post (verified-flag moderation by admin), display in product detail.
- **Blog / Careers** — links exist in the footer, **no pages**; newsletter forms are cosmetic.

---

## 12. Business Logic

### Pricing & shipping
- Backend computes `subtotal` = Σ client-sent item subtotals; `shipping = 0` if subtotal ≥ `shipping_free_threshold` (SiteSettings, default 5000) else `shipping_default_cost` (default 100); `total = subtotal + shipping`. Frontend mirrors this in `utils.calculateShipping/Total` and `useStoreSettings`.
- **Risk:** client can set arbitrary item prices/subtotals → order total is not trustworthy.

### Inventory
- `products.stock` and `products.in_stock` are admin-managed flags only. **No decrement on order, no reservation, no low-stock enforcement.** The `notify_low_stock` setting is never used.

### Coupons, tax, discounts
- **Coupons: none.** **Tax:** `tax_rate`/`tax_id` settings exist but are unused; the `orders.tax` column was dropped. **Discounts:** display-only (`original_price` vs `price` badge); no campaign engine.

### Reviews & ratings
- Rating recomputed on add/delete by scanning all reviews for the product. `verified` flag = admin moderation toggle; only `product.review_count > 0` gates AggregateRating JSON-LD.

### Notifications & emails
- OTP emails (required), new-order email to store admin (fire-and-forget), contact-form email to store admin. **No customer order confirmation email**, no order-status emails, no password emails. `notify_*` settings are stored but only `store_email` is actually read.

### Analytics business rules
- Bots and `/api|/admin|/_next|/uploads` paths skipped; IPs hashed; online presence TTL 5 min; session duration capped at 24h.

---

## 13. Configuration Files

| File | Purpose | Issues |
|---|---|---|
| `package.json` | deps + scripts | no test/typecheck/format scripts |
| `requirements.txt` | pinned Python deps | fine |
| `.env.example` / `.env` / `.env.local` | env vars | `.env.local` has dead NextAuth/admin creds; secrets default to weak values |
| `docker-compose.yml` | dev stack | hardcoded creds; dev-only |
| `Dockerfile.web` | frontend container | runs `npm run dev` — not prod |
| `backend/Dockerfile` | backend container | `--reload`, no workers — not prod |
| `next.config.ts` | headers/rewrites/images | permissive image hosts; hardcoded localhost rewrite |
| `tsconfig.json` | TS strict + alias | fine |
| `tailwind.config.ts` | theme tokens | tokens underused (raw hex everywhere) |
| `eslint.config.mjs` | flat config | fine |
| `postcss.config.mjs` | Tailwind v4 | fine |
| `alembic.ini` / `migrations/env.py` | migrations | create_all vs Alembic duality |
| `nginx` / GitHub Actions / CI | — | **absent** |

---

## 14. Third-Party Services

| Service | Status |
|---|---|
| **Email (SMTP)** | stdlib smtplib; any provider (Gmail/SendGrid templates documented); console fallback in dev. No provider SDK. |
| **Storage** | Local filesystem (`backend/public/uploads`) served by FastAPI + Next rewrite. **No S3/CDN.** |
| **Authentication** | Self-hosted JWT + bcrypt. No OAuth/Social (buttons are placeholders). |
| **Payment** | **None** — COD only. |
| **Analytics** | First-party (own tables + endpoint). No GA/Plausible. No GeoIP provider (country/city always null). |
| **Maps** | None. |
| **Cloud** | None. |
| **External APIs** | None at runtime (unsplash.com used only for seed/mock image URLs). `user-agents` PyPI package for UA parsing. |

---

## 15. Security Analysis

### Findings

| # | Severity | Finding |
|---|---|---|
| 1 | **High** | **Client-controlled order amounts.** `POST /api/orders` trusts `items[].price`/`subtotal` from the request body; totals are not recomputed from the products table. Arbitrary-price orders possible. |
| 2 | **High** | **Admin auth is client-side only.** No Next.js middleware; `/admin` pages (some server components) are SSR-rendered and their data fetches are often public. Protection is layout-level; a direct request can render admin UI (write ops still blocked server-side, but the dashboard/products/tutorials pages are server components hitting public endpoints). |
| 3 | **High** | **Access tokens in localStorage.** JWT (30-day) stored in localStorage → exfiltratable by any XSS. No httpOnly access cookie; refresh cookie unused by client. |
| 4 | **Medium** | **Login has no rate limiting.** OTP endpoints are limited (10–20/hour), login is not → brute-force surface. |
| 5 | **Medium** | **No password reset** → account-recovery gap; dead "Forgot password?" link. |
| 6 | **Medium** | **Weak default secrets.** `SECRET_KEY`/DB creds fall back to dev defaults; production can boot insecure if env is missing. CORS pins `http://localhost:3000` only. |
| 7 | **Medium** | **XSS in CMS content.** `BlockPreview` paragraph renders `dangerouslySetInnerHTML` on admin-authored content (stored XSS if an admin account is compromised or content is unsanitized). |
| 8 | **Medium** | **Upload validation trusts client `content-type`** and preserves the original extension; no magic-byte sniffing, no image re-encoding, no per-user quota. |
| 9 | **Low–Med** | **Email enumeration.** `/auth/request-otp` and `/auth/register` reveal whether an email is already registered (400 "Email already registered"). |
| 10 | **Low** | **Contact form spam** — public POST, no rate limit, no captcha; emails fired to admin. |
| 11 | **Low** | **Analytics endpoint unauthenticated** — anyone can inject fake page views / online visitors (no rate limit). |
| 12 | **Low** | **No CSRF token** — mitigated by bearer-token auth + SameSite=Lax cookie, but cookie-based refresh endpoint has no CSRF protection on token refresh. |
| 13 | **Low** | **Bcrypt/passlib version drift** — pinned `bcrypt==4.0.1` with passlib 1.7.4 (known warning incompatibility; consider bcrypt's own API or upgrade). |
| 14 | **Info** | `dev_otp` leaks the OTP in the API response whenever `smtp_host` is empty — must never happen in production (a single missing SMTP env var would expose OTPs). |
| 15 | **Info** | Analytics IP hash uses a **static salt**; one-way but deterministic. |

### What is done well
- OTPs stored bcrypt-hashed; attempts incremented before verification; tokens are typed (access/refresh/email_verified).
- Passwords bcrypt-hashed; no plaintext anywhere.
- Security headers set in `next.config.ts`; HSTS + `X-Frame-Options` + `nosniff` + Permissions-Policy.
- SQLAlchemy parameterized queries throughout (no raw SQL injection surface beyond one `op.execute` in a migration).
- Admin writes re-checked server-side (`get_current_admin`).
- IPs hashed, bots filtered, analytics paths skipped.

### Recommendations (priority order)
1. Recompute order totals server-side from `products.price × quantity`; validate stock; decrement stock transactionally.
2. Add Next.js middleware enforcing admin auth server-side (verify JWT for `/admin/*`).
3. Move access token to an httpOnly cookie (or shorten TTL + add refresh flow on the client).
4. Rate-limit `/auth/login` and contact/analytics endpoints; add captcha to contact.
5. Add password reset (emailed token, same OTP infra).
6. Enforce strong secrets (fail-fast startup when `SECRET_KEY` is default in production), restrict CORS by env.
7. Sanitize CMS block HTML on save (allowlist) — never trust `dangerouslySetInnerHTML` input.
8. Harden uploads: sniff magic bytes, re-encode images, random filenames (already), content-disposition, per-user limits.
9. Never return `dev_otp` when `ENVIRONMENT=production` regardless of SMTP config.
10. Add standard audit logging, request IDs, and structured error responses.

---

## 16. Performance Analysis

### Issues
- **No caching on catalog pages.** All `api.ts` GETs default `cache: "no-store"`; product/tutorial listings and detail pages hit Postgres on every request. Homepage alone uses ISR (`revalidate: 60`).
- **Heavy eager loads.** Product listing `selectinloads` full `reviews` (every review body) for all 20 rows of a page; reviews are rarely needed in listings.
- **Unindexed filters.** Listing filters on `category_id`, `brand_id`, `price`, `featured`, and `ilike` search have no supporting indexes.
- **Unbounded analytics table.** `page_views` grows per view with no aggregation/retention; unique-visitor queries `DISTINCT` over the full table; no `(created_at, visitor_id)` composite index despite the code comment intending one.
- **Admin list pages fetch everything.** Orders and customers load all rows client-side; tutorials edit fetches 200 tutorials to find one by id.
- **N+1 / repeated queries.** Categories listing runs a second aggregate query (acceptable) ; review rating recompute scans all reviews per write.
- **No image optimization for admin-uploaded images** beyond Next's `next/image` on some surfaces (CMS `BlockPreview` uses raw `<img>`).
- **Sitemap** fetches up to 1000 products + 1000 tutorials on demand with no cache.
- **Sending emails** via `run_in_executor` spawns a thread per email (fire-and-forget); fine at low volume, no queue at scale.
- **No code-splitting analysis; unused components** (`Card`, `Pagination`, `BlockEditor`) ship dead weight; `lucide-react` icons are per-file imports (tree-shakeable, good).
- **`page_views` and heartbeat write on every navigation** — acceptable but could be batched.

### Wins already present
- `next/image` with avif/webp + 30-day TTL; `/_next/static` immutable caching; HSTS.
- Async SQLAlchemy throughout; `pool_pre_ping`.
- Server components keep most customer pages SSR (good TTFB, small JS).
- Background tasks for online-visitor upsert keep the track response fast.

### Recommendations
1. Enable ISR/revalidate on product & tutorial list/detail RSC fetches (e.g., `revalidate: 60`) and add a cache layer (Redis) for catalog reads.
2. Drop reviews from product listing queries; expose a lightweight product list schema (no nested reviews).
3. Add indexes: `products(category_id)`, `products(brand_id)`, `products(price)`, `products(featured, in_stock)`, `page_views(created_at, visitor_id)`.
4. Add server-side pagination to admin orders/customers; add a tutorial get-by-id admin endpoint.
5. Schedule nightly aggregation for analytics (daily rollups) and a retention policy.
6. Implement a real job queue (e.g., arq/Celery or a DB-backed outbox) for emails/notifications.
7. Remove unused components/data files from the client bundle.

---

## 17. Code Quality

### Strengths
- Clean folder structure (route groups, domain components, lib layer) — consistent and navigable.
- Consistent naming (camelCase TS, snake_case Python, grouped API objects).
- Good reusability in `ui/` primitives and the typed `api.ts` client; `cn()` everywhere.
- Server components + client islands are a thoughtful split; SEO layer is centralized in `seo.ts`.
- Backend routers are thin and uniform; Pydantic schemas + async SQLAlchemy usage is idiomatic.
- Security-conscious details (hashing OTP/IP, bot filtering, auth dependencies) show deliberate engineering.

### Weaknesses
- **DRY violations:** `customerAuth`/`adminAuth` are near-identical; admin category pages duplicated (one mock, one real); newsletter forms duplicated; shipping math duplicated frontend/backend; `gen_order_number` and `utils.generateOrderNumber` differ; multiple admin pages repeat list/form scaffolding.
- **Unused/mock code:** `src/data/*` powers only dashboard + two mock pages; `Card`, `Pagination`, `BlockEditor` unused; `banners` table unused; `notify_*`/`tax_rate` settings unused; NextAuth vars dead.
- **Type safety:** pervasive `any` in `api.ts` and component props; frontend types (`src/types`) not derived from backend schemas; snake_case/camelCase mapping done ad hoc in each component.
- **`create_all` + Alembic dual schema management** is a maintainability risk.
- **Naming drift:** `in_stock` bool vs `stock` int semantics blur; `page_size` up to 500; `VALID_STATUSES` (orders router) disagrees with the DB enum (missing shipped/refunded).
- **Inconsistency:** admin settings UI uses Rs. but defaults USD; mock data uses USD while product UI formats Rs.
- **SOLID:** controllers mix validation, business logic, and persistence (acceptable at this size, but services layer is underused — only analytics).
- **Comments:** code is heavily commented (somewhat beyond what's typical; helpful).

---

## 18. Dependency Graph

```
src/ (frontend)
  ├─ app/ pages ──────────────► src/components/*
  │        ├──────────────────► src/context/CartContext
  │        ├──────────────────► src/lib/* (api, auth, seo, utils, constants, cms-store)
  │        └──────────────────► src/data/*  (dashboard + mock admin pages only)
  ├─ components ──────────────► src/lib/utils, src/lib/constants, src/lib/api, src/context/CartContext
  ├─ lib/api.ts ──────────────► NEXT API proxy (/api/[...path]) ──► FastAPI
  └─ app/layout ──────────────► components/WebVitals, context/CartProvider, lib/seo

backend/
  ├─ main.py ────────────────► app/routers/*  (13)
  ├─ routers/* ──────────────► app/schemas/*, app/models, app/security, app/database,
  │                             app/email_service, app/limiter, app/services
  ├─ app/security.py ────────► app/config, app/database, app/models
  ├─ app/services/* ─────────► app/models, app/database
  ├─ app/models ─────────────► app/database (Base)
  └─ app/database ───────────► app/config

data layer:
  app/models + app/services ─► PostgreSQL (asyncpg)
  uploads ───────────────────► local filesystem (backend/public/uploads)
```

Layering is clean (pages → components → lib → API; routers → services → models → DB). The main smell: **admin components/pages bypass the service layering entirely** (local mock state), and **the CMS admin layer writes to an in-memory store instead of the API**.

---

## 19. Complete User Journey

1. **Visits homepage** — RSC renders hero/categories/featured from ISR fetches; `AnalyticsBeacon` records the view; root Organization/WebSite JSON-LD injected globally, plus homepage `WebPage` + featured `ItemList` schema.
2. **Searches product** — Navbar search → `/search?q=...`; server runs product + tutorial `ilike` search; results with "view all".
3. **Views product** — `/products/[slug]`; RSC fetch; gallery, specs, reviews, related products; Product JSON-LD + BreadcrumbList; views tracked.
4. **Adds to cart** — `AddToCartSection`/`ProductCard` → CartContext → localStorage; navbar badge updates.
5. **Checks out** — `/checkout`; redirected to login if needed; 3-step form; shipping threshold/cost from settings; COD selected.
6. **Pays** — "Cash on Delivery" (no payment gateway); order created with `payment_status=pending`.
7. **Receives email** — Admin receives a new-order notification email; **customer receives no confirmation**.
8. **Tracks order** — `/profile` → order history; status updates appear after admin changes status (customer is never emailed).
9. **Leaves review** — product page → `WriteReviewForm`; requires login; review lands with `verified=false`; admin approves in `/admin/reviews`; rating recomputed; JSON-LD AggregateRating appears once review_count > 0.

---

## 20. Deployment Workflow

### Current state
- **Development:** `docker-compose up` brings up Postgres + API + web (`npm run dev`, uvicorn `--reload`). Frontend proxies `/api/*` and `/uploads/*` to the API.
- **Production:** **No production pipeline exists.** No GitHub Actions/workflows, no nginx, no Docker production profile, no build/deploy scripts, no migrations step, no backups, no monitoring, no logging aggregation.

### Gaps to close for production
- **Environment:** per-env `.env.production` with strong `SECRET_KEY`, real SMTP creds, `NEXT_PUBLIC_SITE_URL`, restricted CORS origin, `ENVIRONMENT=production` (turns on Secure cookies and disables dev OTP leak).
- **Build:** `npm run build` + `next start` (or `output: 'standalone'`); backend `uvicorn` with workers, no `--reload`; static uploads on volume/S3.
- **Migrations:** run `alembic upgrade head` as a deploy step (stop relying on `create_all`).
- **Reverse proxy / SSL:** nginx/Caddy terminating TLS in front of Next.js and FastAPI; `/uploads` must be routable in prod.
- **Monitoring & logging:** structured logs, request IDs, uptime/health checks, error tracking, Core Web Vitals endpoint (create `/api/vitals` on the backend or send to an analytics service).
- **Backup:** nightly `pg_dump`/`pg_basebackup` for the `postgres_data` volume, plus restore drills.
- **CI:** lint + typecheck + backend tests on PR; build + migrate + deploy on main.

---

## 21. Missing Features

Ranked by priority:

**Critical**
1. **Real payment gateway** (only COD today) — e.g., eSewa/Khalti for Nepal, or Stripe.
2. **Server-authoritative order totals + stock decrement** (current orders can be priced arbitrarily and oversold).
3. **Server-side admin authorization (middleware)** — admin routes must be protected before serving HTML.
4. **Customer order confirmation emails + status-change emails.**

**High**
5. **Password reset flow.**
6. **Rate limiting on login/contact/analytics-tracking endpoints.**
7. **Persistent newsletters** (currently cosmetic) and a real Blog/Careers page (footer links dead).
8. **CMS storefront rendering** — consume `cms_pages` on the public site (currently a standalone builder), with auth token on CMS saves.
9. **Wire banners to the API** (DB table exists, admin is mock, storefront doesn't render them) and connect product categories/banners/dashboard admin pages to real APIs.
10. **GeoIP for analytics** (country/city columns always null) and a `/api/vitals` endpoint.

**Medium**
11. Coupons/discount codes; wishlist, addresses, payment methods, rewards (profile placeholders).
12. Tax calculation wired to orders (settings exist; column dropped).
13. Search improvements (full-text search, facets on `/search`), admin server-side pagination.
14. Social login (Google/GitHub placeholders).
15. Order tracking numbers/status timeline UI; review edit by customer.

**Low**
16. Dark-mode/PWA polish (manifest exists, no service worker); i18n (Nepali); email templates centralization; admin audit log; activity feed.

---

## 22. Bugs and Risks

### Bugs
- **`EmptyState` CTA bug:** passes `as`/`href` to `Button`, which doesn't implement them → CTA renders as `<button>` and won't navigate (affected `/products` empty state).
- **CMS container renders only its first child** (`BlockPreview`), so multi-block containers lose content in preview.
- **CMS paragraph `dangerouslySetInnerHTML`** — no sanitization (stored XSS vector).
- **CMS API calls are unauthenticated** → page builder saves fail server-side (401), so CMS edits silently persist only in memory and are lost on reload.
- **Tutorial views increment on every GET** (including crawlers/admin/bot traffic — analytics-style skip not applied) — inflated view counts; also makes the detail request non-idempotent for caches.
- **Order status enum mismatch:** backend `VALID_STATUSES` excludes `shipped`/`refunded` that the DB enum and frontend types include; admin UI also omits them.
- **`orders` list/cancel use `str(user_id)` comparison** — if `user_id` is None (deleted user), string "None" could match only None; non-issue in practice but fragile.
- **Duplicate admin category pages** (`/admin/categories` real vs `/admin/products/categories` mock) — confusion and data divergence risk.
- **`in_stock` manual flag can contradict `stock > 0`** — ProductCard derives from `in_stock`, detail page derives from `in_stock ?? stock>0`; inconsistent.
- **Shipping math duplicated** (backend vs `utils`/`useStoreSettings`) with different defaults (5000/100 backend vs 50/5.99 frontend fallback) — can show different totals if settings missing.
- **`ProductUpdate` can't update slug/SKU** — admin UI marks them read-only (intentional) but API accepts them silently on PUT for other fields.
- **Admin settings password change uses raw fetch** with a different error shape.
- **`dev_otp` in response** if SMTP unset — production foot-gun.
- **Delete category/brand/tutorial-category** doesn't guard against rows still referenced (FK error surfaces as 500).

### Risks
- **Data integrity:** orders don't decrement stock; no order-item ↔ product FK (snapshot JSONB — by design, but no reconciliation).
- **Scale:** unbounded `page_views`, client-side admin table loading, no pagination on several endpoints.
- **Schema drift:** `create_all` + Alembic dual management; migrations added with `IF NOT EXISTS` workarounds.
- **Tech debt:** mock admin surfaces, unused tables/columns (`banners`, `tax_rate`, `notify_*`, `dev_otp`), dead NextAuth config, boilerplate README.

---

## 23. Improvement Roadmap

### Phase 1 — Hardening (foundation) — difficulty: Medium · impact: High
- Server-authoritative order pricing + transactional stock decrement + stock validation.
- Next.js middleware for server-side admin auth; move access token to httpOnly cookie or add client refresh flow.
- Rate limiting on login/contact/track; secrets fail-fast; restrict CORS/image hosts; SMTP required in production (no `dev_otp`).
- Password reset via existing OTP infrastructure.
- Create `/api/vitals` endpoint; wire up error reporting.

### Phase 2 — Data integrity & performance — difficulty: Medium · impact: High
- Alembic-only migrations (remove startup `create_all`); add missing indexes; paginate admin lists; light product list schema (no nested reviews).
- ISR/cache for catalog reads; Redis option; analytics daily rollups + retention; composite analytics index.
- Sanitize CMS HTML; add auth token to CMS saves; render CMS pages on the storefront or remove the builder.

### Phase 3 — Commerce completeness — difficulty: High · impact: High
- Payment gateway integration (COD + gateway) with proper payment status transitions.
- Customer order/status emails; order tracking UI.
- Coupons, tax calculation, wishlist/addresses, real newsletter capture + blog.
- Migrate remaining mock admin surfaces (dashboard, product categories, banners) to the API.

### Phase 4 — Productionization & scale — difficulty: High · impact: Medium
- Production Docker profiles (build image, workers), nginx/Caddy + TLS, domain, CDN for uploads (S3-compatible).
- CI/CD (lint, typecheck, tests, build, migrate, deploy); monitoring (metrics + structured logs); automated backups with restore drills.
- i18n (Nepali/English), PWA/service worker, full-text search, admin audit log.

---

## 24. Architecture Diagram

```
                     ┌───────────────────────────────────────────────┐
                     │                 Browser / Clients             │
                     │  Customers            Admins                  │
                     └───────────┬───────────────────┬───────────────┘
                                 │                   │
                                 │  HTTPS (TLS via    │  HTTPS (TLS via
                                 │  reverse proxy)    │  reverse proxy)
                                 ▼                   ▼
                     ┌───────────────────────────────────────────────┐
                     │         Next.js App Router (web :3000)        │
                     │                                               │
                     │  Server Components ──► FastAPI directly       │
                     │       (API_INTERNAL_URL)                      │
                     │  Client Components ──► /api/* proxy route     │
                     │  /uploads/* rewrite                           │
                     │  SEO: metadata, sitemap, robots, JSON-LD      │
                     └──────────────┬────────────────────────────────┘
                                    │  HTTP (Docker network, :8000)
                     ┌──────────────▼────────────────────────────────┐
                     │              FastAPI (api :8000)              │
                     │  Auth  Catalog  Orders  Tutorials  CMS        │
                     │  Reviews  Settings  Contact  Upload           │
                     │  Analytics  Users  Categories  Brands         │
                     │  + Security/JWT  + Rate limiting  + Emails    │
                     │  + Static /uploads (local filesystem)         │
                     └──────┬──────────────────┬─────────────────────┘
                            │                  │
                            ▼                  ▼
              ┌──────────────────────┐   ┌──────────────────────┐
              │    PostgreSQL 16     │   │   SMTP (email)       │
              │  (db :5432, volume   │   │   OTP / order /      │
              │   postgres_data)     │   │   contact notifications│
              │  15 tables, JSONB,   │   └──────────────────────┘
              │  UUIDs, enums,        │
              │  Alembic migrations   │
              └──────────────────────┘

External/planned: Payment gateway (none today), object storage (local today),
GeoIP provider (unconfigured), monitoring/logging (absent).
```

---

## 25. Final Summary

### Scores (out of 10)

| Dimension | Score | Rationale |
|---|---|---|
| **Overall** | **6.5 / 10** | Strong architecture and feature breadth; undermined by mock admin surfaces, client-side-only admin auth, and unverified order totals. |
| **Architecture** | **8 / 10** | Clean monorepo, clear layering, sane RSC/client split, typed API client, centralized SEO. |
| **Security** | **4.5 / 10** | Good fundamentals (bcrypt, JWT, hashed IPs, rate-limited OTP) but client-trusted order math, localStorage tokens, no server-side admin gate, no login throttling, weak defaults. |
| **Performance** | **5 / 10** | Async stack + image config good; but no-store everywhere, unbounded analytics, unindexed filters, heavy eager loads. |
| **Code quality** | **6.5 / 10** | Consistent and readable; heavy duplication, dead/mock code, `any` typing, dual schema management. |
| **Scalability** | **4 / 10** | Single-box dev compose, no pagination on admin lists, growing analytics table, no queue/cache. |
| **SEO** | **8.5 / 10** | Best-in-class: sitemap, robots, canonical, full JSON-LD suite, OG/Twitter; docked for missing og image assets and zero metadata on search/account pages. |
| **Deployment readiness** | **2.5 / 10** | Dev-only compose, no CI/CD, no TLS/proxy, no backups/monitoring, migrations not automated in deploy. |
| **Production readiness** | **3 / 10** | Blocking issues: order pricing trust, admin auth model, no payment, no production pipeline. |
| **Portfolio readiness** | **7 / 10** | Impressive surface area (builder, analytics, OTP auth, SEO) and clean code — will look great once mock surfaces are wired and security hardening lands. |

### Biggest strengths
1. **Architecture & DX** — clean separation, typed API client, centralized SEO layer, disciplined RSC/client split.
2. **Security-conscious basics** — hashed OTP/IPs, bcrypt, typed JWTs, bot filtering, security headers.
3. **Feature breadth** — full e-commerce flow, tutorials, admin panel, CMS page builder, and first-party analytics.
4. **SEO depth** — a genuinely strong, schema-rich SEO implementation.

### Biggest weaknesses
1. **Mock/incomplete admin surfaces** — dashboard, product categories, banners are fake; CMS builder persists only in memory.
2. **Security gaps on money paths** — client-controlled order totals, no stock enforcement, client-side-only admin gate, localStorage tokens.
3. **No production story** — dev-only containers, no CI/CD, no payment, no backups/monitoring.
4. **Technical debt drift** — dead settings/columns, duplicate auth hooks and category pages, unused components.

### Top 10 highest-impact improvements
1. Recompute order totals server-side and decrement stock transactionally.
2. Add server-side admin auth (Next.js middleware).
3. Move access tokens to httpOnly cookies + implement the refresh flow.
4. Add login/contact/track rate limiting and a password-reset flow.
5. Wire the dashboard, banners, and duplicate category page to real APIs; persist CMS pages with auth tokens and render them on the storefront.
6. Add a payment gateway and customer order/status emails.
7. Replace `create_all` with Alembic-only migrations; add the missing DB indexes.
8. Introduce caching (ISR/Redis) and pagination for admin lists; lighten product listing queries.
9. Build a production deployment: prod Docker profiles, nginx/TLS, CI/CD, monitoring, backups.
10. Sanitize CMS HTML and harden file uploads (magic-byte sniffing, image re-encoding).

---

*End of audit. This document describes the codebase as of August 5, 2026. The companion `DATABASE_AUDIT.md` covers the schema in additional depth.*

# IoTMart — System Audit & Deployment Assessment

**Project:** `iot-store` — IoTMart, an e-commerce platform for IoT hardware
**Date:** August 6, 2026
**Audit scope:** Full-stack — Next.js frontend, FastAPI backend, PostgreSQL schema, Docker, CI, tests, security, performance.

---

## 1. Executive Summary

IoTMart is a complete, working e-commerce platform for IoT components (sensors, microcontrollers, dev boards) targeting Nepal. It ships a customer storefront, a tutorial library, OTP-gated registration, COD checkout, a full admin back office, a visual CMS page builder, and first-party analytics.

**Verdict — is it worth deploying? Yes, with conditions.**

The application is functionally complete and secure enough for a **soft launch** (limited users, COD only). All previously-flagged "blocking" issues are resolved: order totals are server-authoritative, admin routes are guarded server-side, tokens live in httpOnly cookies, uploads/CMS are hardened, coupons work end-to-end, and there is a CI workflow plus production Docker profiles.

Three things **must** happen before serious production traffic:
1. **Payment gateway** — COD only today.
2. **A real deployment run** — TLS/proxy, S3/CDN for uploads, scheduled analytics rollups, backups — the CI and prod-compose files exist but have never been executed.
3. **Harden the last edges** — refresh-token CSRF, account lockout, admin-route-level auth enforcement.

For a portfolio demo, hobby store, or small shop at low volume, it is deployable now.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, lucide-react |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, Alembic, Pydantic v2, slowapi, bleach, Pillow |
| Database | PostgreSQL 16 |
| Auth | JWT (HS256), bcrypt, httpOnly cookies, OTP-gated registration |
| Email | stdlib smtplib (thread-pool), console fallback in dev |
| Containerization | Docker Compose (dev) + `docker-compose.prod.yml` |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Testing | pytest + pytest-asyncio (47 tests passing) |

---

## 3. Architecture

```
Browser
  ├─ Server Components ──► FastAPI directly (API_INTERNAL_URL)
  └─ Client Components ──► /api/* ─► Next.js catch-all proxy ─► FastAPI
                                              │
                                    FastAPI (backend/main.py, 21 routers)
                                              │
                             SQLAlchemy async  │   /uploads (local FS)
                                              ▼
                                   PostgreSQL 16 (25 tables)
```

- **Next.js is both UI and API gateway.** The proxy forwards cookies/`Set-Cookie`, rewrites `/uploads/*`, and now rejects cross-site requests (CSRF check).
- **Admin guard:** `src/proxy.ts` middleware requires an httpOnly `admin_token` cookie, validated against the backend, before serving any `/admin/*` route.
- **Schema:** fully Alembic-managed (startup `create_all` removed); migration `b087754e9955` is applied at head.

---

## 4. Feature Inventory

**Storefront:** homepage (hero/categories/featured), filtered product listing, full-text search, product detail (gallery, specs, reviews, related), cart (localStorage), COD checkout with coupon support, order history with tracking timeline.

**Tutorials:** listing with category/difficulty filters; detailed guides with wiring tables, code blocks, and "shop components" cross-links.

**Auth:** 3-step OTP registration, login, password reset (forgot/reset flow), refresh tokens, customer + admin roles.

**Admin:** dashboard (with activity feed), products, categories, brands, orders (status incl. shipped/refunded), customers (paginated), tutorials, reviews moderation, banners (mock), **coupons (CRUD)**, analytics (with daily rollups), settings, CMS page builder.

**Commerce:** COD, server-side pricing, transactional stock reservation, coupon engine (percent/fixed, min-subtotal, usage caps), reward points, wishlist, saved addresses.

**Extras:** newsletter, first-party analytics (page views, sessions, online visitors), PWA service worker, admin audit log, structured error responses.

---

## 5. Backend

### Routers (21, registered in `main.py`)
`auth, users, categories, brands, products, tutorials, orders, cms, upload, banners, admin, reviews, settings, contact, analytics, newsletter, wishlist, addresses, rewards, vitals, coupons`

- **auth** — OTP flow (request/verify/register), login/refresh/logout/me, forgot/reset-password. Rate-limited (10/hr OTP, 10/min login).
- **products** — FTS search (`search_vector @@ plainto_tsquery`, GIN-indexed) with ilike fallback; listing no longer eager-loads reviews.
- **orders** — server-side pricing with `FOR UPDATE` row locks; **coupon discount** applied before the free-shipping threshold; stock decremented in one atomic transaction; list supports `page/page_size/status/search`.
- **coupons** — admin CRUD + public `POST /validate` (30/hr, never consumes usage); order placement increments `used_count`.
- **analytics** — track/heartbeat (rate-capped) + admin dashboards + `GET/POST /api/admin/rollup` (daily aggregates).
- **upload** — magic-byte sniffing, Pillow re-encode, format-derived extension, per-user quota (100 MB default) via `user_uploads` ledger.
- **vitals** — Core Web Vitals intake (public POST 120/min, admin GET).

### Services
- `analytics_service.py` — page-view recording, online visitors, daily rollups (`run_daily_rollup`), retention (`prune_old_views`).
- `coupons.py` — `compute_discount`, `validate_coupon`, `apply_coupon`.
- `audit.py` — `record()` helper for the admin audit log.
- `sanitize.py` — bleach-based HTML sanitization for CMS blocks.

### Cross-cutting
- `config.py` — pydantic-settings; fail-fast production boot on weak secrets/`DEBUG=true`.
- `security.py` — JWT + bcrypt + `get_current_user`/`get_current_admin`.
- `limiter.py` — shared slowapi instance.
- Request-ID + structured access-log middleware; generic 500 and 422 handlers that never leak internals.

---

## 6. Frontend

### Routes
- **Customer:** `/`, `/products`, `/products/[slug]`, `/search`, `/tutorials`, `/tutorials/[slug]`, `/cart`, `/checkout`, `/login`, `/register`, `/forgot-password`, `/profile`, `/contact`, `/faq`, static policies.
- **Admin:** dashboard, products (list/new/detail/edit), categories, brands, orders (+detail), customers, tutorials (+categories), reviews, banners (mock), **coupons**, analytics, settings, pages (+builder).

### State & data
- Cart via React context + localStorage; customer/admin auth via localStorage TTL + httpOnly cookies.
- `lib/api.ts` — single typed client (grouped APIs incl. `couponsApi`, `ordersApi.list(params)`, `usersApi.list(params)`), public catalog GETs use `revalidate: 60`.
- `src/data/*` — legacy mock data still used only by the dashboard and banners page.

### Notable components
- `src/proxy.ts` (admin middleware), `AnalyticsBeacon`, `WebVitals`, `OrderHistoryPanel` (tracking timeline), `ProductReviews` (author-edit), `AdminSidebar` (Coupons nav), CMS builder suite.

---

## 7. Database (25 tables)

**Core:** `users`, `categories`, `brands`, `products` (FTS `search_vector` + GIN index), `product_reviews`, `tutorial_categories`, `tutorials`, `orders` (`discount_amount`, `coupon_code`), `cms_pages`.

**Commerce:** `coupons`, `wishlist_items`, `saved_addresses`, `reward_transactions`, `newsletter_subscribers`.

**Auth/audit:** `email_pending_verifications`, `password_reset_tokens`, `admin_audit_log`, `vital_metrics`, `user_uploads`.

**Analytics:** `page_views`, `online_visitors`, `daily_analytics`.

**Other:** `contact_messages`, `site_settings`, `banners` (table unused — admin is mock).

All UUID PKs, timezone-aware timestamps, JSONB for flexible data, native Postgres enums.

---

## 8. Security Analysis

### Resolved (previously flagged)
| Area | Status |
|---|---|
| Order totals | Server-authoritative, row-locked, atomic stock decrement |
| Admin authorization | Server-side middleware (`admin_token` cookie) |
| Token storage | httpOnly + SameSite=Lax cookies; no tokens in localStorage |
| Login/contact/analytics throttling | Rate-limited; contact has honeypot + CSRF origin check |
| Password reset | Enumeration-safe, expiring single-use tokens |
| Weak secrets | Fail-fast production boot; configurable CORS |
| CMS XSS | Bleach sanitization on save |
| Uploads | Magic-byte sniffing + re-encode + per-user quota |
| `dev_otp` leak | Suppressed in production; SMTP required in prod |
| Audit | Admin audit log + request IDs + structured errors |

### Remaining
- **Medium:** email enumeration on register/request-otp; no account lockout beyond OTP attempts; no client-side auto-refresh on 401.
- **Low:** refresh-token endpoint CSRF (mitigated by SameSite); static-salt IP hashing; admin UI auth is client-gated (server proxy guards HTML, API re-checks writes).
- **Info:** 30-day access tokens; social login buttons are placeholders.

---

## 9. Performance

**Good:** async SQLAlchemy, GIN-indexed full-text search, reviews dropped from listings, catalog revalidate 60, `next/image` avif/webp, immutable static caching, pagination endpoints for customers/orders.

**Weak:** still `no-store` on detail pages; no index on `category_id/brand_id/price/featured`; `page_views` grows unbounded (rollups exist but are manual); admin orders UI loads the flat list; sitemap unscaled; no Redis.

---

## 10. Testing & Quality

- **47 backend tests pass** (OTP flow + analytics) — OTP tests use `app.dependency_overrides[get_db]`.
- `tsc --noEmit` clean; `npm run build` clean; ESLint passes (build-enforced).
- **No frontend unit tests; no coverage for products/orders/coupons/users.**
- Code is consistent and well-commented; `any`-typing in `api.ts` and duplicate auth hooks remain as debt.

---

## 11. Deployment Assessment

### What exists
- `docker-compose.prod.yml` + production `Dockerfile` (backend: uvicorn workers; frontend: `next build` + standalone).
- GitHub Actions `ci.yml` (lint → typecheck → backend tests → build).
- PWA service worker; structured logging; health endpoint.

### What is missing before serious traffic
1. **Payment gateway** (COD only) — the single biggest commercial blocker.
2. **Executed production run** — TLS/reverse-proxy, S3-compatible storage for uploads, real SMTP creds, strong secrets, `ENVIRONMENT=production`.
3. **Operational basics** — scheduled analytics rollup, nightly DB backups, uptime monitoring, migrate-on-deploy step.

### Suggested launch path (low risk)
1. **Now (portfolio/small store):** deploy with COD, nginx/Caddy + TLS, env vars, `alembic upgrade head` as a deploy step.
2. **Phase 2:** add eSewa/Khalti/Stripe; wire dashboard + banners to the API; schedule rollups.
3. **Phase 3:** payment + accounts hardening (lockout, refresh CSRF), Redis, S3 uploads, backups automation.

---

## 12. Scorecard

| Dimension | Score (0–10) | Note |
|---|---|---|
| Overall | 8.0 | Complete feature set, hardened core, CI + prod compose |
| Architecture | 8.0 | Clean layering, RSC/client split, typed API client |
| Security | 8.5 | Strong fundamentals; a few low/medium edges left |
| Performance | 6.0 | Solid basics; caching + indexing still partial |
| Code quality | 7.0 | Consistent; some `any` and mock/dead code |
| SEO | 8.5 | Full JSON-LD suite, sitemap, canonical, OG |
| Production readiness | 4.5 | Artifacts exist; never executed, no payment, no backups |

**Bottom line:** feature-complete and launch-ready as a demo or low-volume shop. Treat payment integration, an executed production deployment, and operational tooling as the prerequisites for scaling.

---

*End of audit — August 6, 2026. Companion deep-dive: `DATABASE_AUDIT.md`.*

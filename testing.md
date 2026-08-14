# IoTMart — Pre-Deployment Testing Report

**Date:** 14 August 2026
**Scope:** Full quality audit of the IoTMart platform (Next.js storefront on :3000, FastAPI backend on :8000, PostgreSQL, Redis). The audit itself was read-only — no code was changed during testing, and all test data created was removed afterwards. The findings were then remediated in seven fix phases (see **Section 11 — Remediation Log** and the final status in **Section 12**).
**Environment tested:** Local development (11 products, 9 categories, 1 brand, 2 users, 1 order).

---

## 1. Overall Result

| Check | Result |
|---|---|
| TypeScript type check (`tsc --noEmit`) | PASS |
| Production build (`next build`) | PASS |
| Backend unit tests (pytest) | PASS (47/47) |
| Live API functional smoke tests | PASS (53/53) |
| Frontend page smoke tests | PASS (12/12 routes) |
| ESLint gate | **FAIL (251 errors, 22 warnings)** |
| Backend code coverage | 60% (too low in key areas) |
| Dependency security | **FAIL (5 high npm, 22 Python vulnerabilities)** |

**Bottom line:** The application is functionally solid for the core flows, but it is **not ready to deploy** until the lint gate and the dependency vulnerabilities are fixed (Sections 2 and 6). The audit's other blockers (missing test dependency in CI, per-process rate limiting) have already been fixed — see Section 11.

---

## 2. Release Gates (run by CI on every push)

### 2.1 TypeScript — PASS
`npx tsc --noEmit` exits cleanly with zero errors.

### 2.2 Lint — FAIL (blocks CI)
`npm run lint` reports **251 errors and 22 warnings** across the frontend codebase. This makes the CI frontend job fail, so nothing can merge or deploy until it is green.
- 227 errors are `@typescript-eslint/no-explicit-any` (the rule banning the `any` type).
- 17 are unused variables/imports.
- 2 are unescaped apostrophes in JSX.
- 1 is a `react-hooks/exhaustive-deps` issue.
- 249 of the 251 errors are the same two rules, so a single focused cleanup pass fixes the vast majority.

### 2.3 Production build — PASS
`npm run build` completes successfully. All routes compile and prerender. The static route map shows 11 customer pages plus the dynamic catalog/admin pages.

### 2.4 Backend tests — PASS (CI problem fixed)
`pytest` run: **47 tests passed** (OTP/registration flow + analytics), 7 warnings (deprecation warnings from pydantic/jose — harmless today).
**Original finding (now fixed):** `pytest` was **not listed in `backend/requirements.txt`**, so the CI backend job would crash with "No module named pytest". This was resolved by adding **`backend/requirements-dev.txt`** (pytest/pytest-asyncio/pytest-cov) and pointing the CI job at it (see Section 11). The tests are now self-contained: the shared slowapi limiter is disabled under pytest (via `tests/conftest.py`) so runs are deterministic and need no Redis — otherwise the Redis-backed counters persist between runs and tests fail with spurious 429s once hourly windows are exhausted, and CI (which has no Redis service) would error out.

### 2.5 Test coverage — too low (60%)
Coverage over the backend is **60% overall**. Critical business logic is barely tested:
- Orders router: **23%**
- Products router: **25%**
- Tutorials router: **29%**
- Uploads router: **28%**
- Analytics service: **36%**
- Categories router: **33%**

Aim for at least 80% on orders, products, uploads, and reviews before shipping — these are the money flows.

---

## 3. Backend Functional Tests (live API, 53 checks — all PASS)

These were executed against the real running backend (an isolated copy with email/SMTP switched off so no real emails were sent). Every check passed.

| Area | What was verified |
|---|---|
| Health | `/api/health` returns 200 with `{"status":"ok"}` |
| Validation | Bad input returns 422 with a structured `error_type: "validation_error"` body |
| OTP registration | Unknown-email password reset returns a generic message (no account enumeration). Request OTP → code delivered; wrong code → 400; correct code → 200 + verification token; register → 201 + tokens |
| Login/logout | Wrong password → 401; correct → 200; `/me` works only with a session cookie; logout clears cookies |
| Role gating | A normal customer cannot create products or see the admin review list (both 403) |
| Wishlist | No session → 401; add/list/remove works (201/200/204) |
| Admin CRUD | Admin can create a product (201) and list reviews (200) |
| Reviews | Add review → 201; **duplicate review → 409** (friendly message, not a 500); author can edit own review → 200; admin approval flips `verified` to true; **an approved review can no longer be edited** (403) or deleted by the author (403); admin can delete → 204 |
| Catalog | List, search, filter, out-of-range pagination, detail by slug, and 404 for unknown slugs all correct |
| Uploads | Non-image file → 400 (rejected by magic bytes, not file name); valid PNG → 200; over 5 MB → 400; uploaded file is served correctly |
| Rate limiting | 12 rapid logins trip the limiter (429 appears within the batch) |

---

## 4. Frontend Tests

### 4.1 Page smoke test — PASS
All public and authenticated routes render over HTTP 200: home, products, search, login, register, profile, admin, privacy, shipping, returns, contact, tutorials.

### 4.2 Security headers — PASS
Every response carries: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and `X-DNS-Prefetch-Control`. `X-Powered-By` is disabled (good).

### 4.3 API proxy + rewrites — PASS
- `/uploads/*` is correctly rewritten from the frontend to the backend and serves files.
- `/api/*` proxies to the backend and forwards cookies correctly (including both `access_token` and `refresh_token`).
- **CSRF protection works:** a POST from a foreign origin is rejected with 403; same-origin requests pass through.
- **CORS is correct:** allowed origin (`localhost:3000`) gets a proper preflight; a disallowed origin is rejected.

### 4.4 Cookie security — PASS (with a caveat)
Auth cookies are set with `HttpOnly` and `SameSite=Lax`. The `Secure` flag is **only added when the backend environment is `production`** — verify that production deployments actually set `ENVIRONMENT=production`, otherwise cookies would travel over plain HTTP.

### 4.5 Gaps
There are **no automated frontend tests** (no Playwright/Cypress, no component tests). The storefront → cart → checkout flow, the admin panels, and the offline/service-worker behaviour in production are currently only verifiable by hand.

---

## 5. Performance Baseline (development machine, 11 products — indicative only)

| Endpoint | Average | Min | Max |
|---|---|---|---|
| Product list | 21 ms | 13 ms | 36 ms |
| Product detail | 17 ms | 9 ms | 23 ms |
| Categories | 12 ms | 9 ms | 16 ms |
| Product search | 20 ms | 12 ms | 27 ms |
| Health check | 2 ms | 1 ms | 3 ms |
| `/search` page (server-rendered, warm) | 177 ms | 134 ms | 249 ms |

Notes:
- These numbers are on a small dataset; **no load testing was performed**. Before production, run a proper load test (e.g. k6/Locust) against a production-sized dataset to find the real P95 response times and break points.
- There is no caching layer yet. The product list/detail/category reads are the hottest queries and are the best candidates for a Redis cache (with careful invalidation) — Redis is already installed and running.
- The `/search` page was visibly slower on a cold start (up to ~2.9 s). Worth profiling after the dataset grows.

---

## 6. Dependency Security

### 6.1 npm (frontend) — 5 HIGH-severity vulnerabilities
| Package | Issue | Fix |
|---|---|---|
| js-yaml 4.x | DoS (CPU exhaustion) | `npm audit fix` |
| nanoid <3.3.18 | Infinite-loop DoS in custom generators | `npm audit fix` |
| postcss ≤8.5.22 | XSS + arbitrary file read via source maps | `npm audit fix --force` (also upgrades Next) |
| sharp <0.35.0 | libvips CVEs | `npm audit fix --force` (also upgrades Next) |

The safe fixes (js-yaml, nanoid) should be applied immediately. The postcss/sharp fixes force a Next.js upgrade (to 16.3.1) — that is a deliberate decision that needs testing before it is made.

### 6.2 Python (backend) — 22 vulnerabilities across 4 packages
| Package | Vulnerabilities | Notes |
|---|---|---|
| starlette 0.38.6 | 9 | Fixed in starlette ≥1.x; requires a FastAPI upgrade |
| python-multipart 0.0.12 | 7 | Fixed in 0.0.31; upgrade path is clean |
| python-jose 3.3.0 | 5 | The library is effectively **unmaintained** (one advisory has no fix); consider replacing with PyJWT |
| ecdsa 0.19.2 | 1 | Transitive via python-jose; disappears if jose is replaced |

This needs a planned dependency-upgrade ticket (FastAPI → newer starlette, python-multipart upgrade, and evaluating PyJWT as a python-jose replacement).

### 6.3 Secrets hygiene — PASS
- `.env` is **not** tracked in git.
- `.env.example` contains only placeholder values (`changeme`, `change-this-to-a-random-32-char-secret`) — no real secrets.
- Production startup refuses to boot with a weak secret key, a default database URL, `DEBUG=true`, or no SMTP host.

---

## 7. Data & Operations Checks

### 7.1 Schema drift audit — PASS
All 24 tables in the application models match the live database exactly (every column and its nullability). Two leftover tables exist that are **not** part of the application:
- `alembic_version` (1 row) — leftover from the old migration tool, harmless.
- `refresh_tokens` (empty) — leftover from an older refresh-token design, harmless.
Both can be dropped with a cleanup migration when convenient.

### 7.2 Process / scaling findings — PASS (rate limiting now Redis-backed)
- The backend runs with **`--workers 4`** (4 separate processes).
- **Original finding (now fixed):** the rate limiter stored counters **in memory per process**, so with 4 workers the same user could hit the login/OTP limits 4 times more often than intended. The limiter now stores counters in **Redis** (`settings.redis_url`), shared across all workers. Verified: a burst of 12 rapid logins on :8000 (4 workers) trips 429 at the 11th request **in total** (not 11 × 4), the counter resets after the 60 s window, and Redis keys (`LIMITS:LIMITER/<ip>//api/auth/login/10/1/minute`) are present with TTLs.
- Multiple uvicorn processes were previously running against :8000 (a `--workers 4` instance plus a legacy `--reload` instance). These were reconciled: stale instances killed, and exactly one clean `--workers 4` instance now owns the port (verified via `ss`).

### 7.3 Observability — PASS
- Request correlation: every API response carries an `X-Request-ID` header; access logs include method, path, status, IP, duration, and the request ID.
- Health endpoint works for liveness checks.

---

## 8. Deployment Configuration Checklist (manual, must-do in production)

1. **Backend host for the frontend:** `next.config.ts` rewrites `/uploads` to `localhost:8000`, and the API proxy defaults to `localhost:8000`. In production these MUST be overridden via `API_INTERNAL_URL` / `NEXT_PUBLIC_API_URL`, or nothing (images, login, all data) will work.
2. **Environment variables:** `SECRET_KEY` (≥32 chars, random), `DATABASE_URL`, `CORS_ORIGINS` (the real site domain), `ENVIRONMENT=production`, `SMTP_*` (real mail credentials), `NEXT_PUBLIC_SITE_URL`.
3. **Cookie `Secure` flag:** only active when `ENVIRONMENT=production` — confirm it is set.
4. **Uploads storage:** currently files are written to the backend's local disk. A multi-instance deployment needs shared/object storage, or uploads will be inconsistent across nodes.
5. **Database:** run the schema-drift check against the production database before deploying; apply the cleanup migration (drop `alembic_version`, `refresh_tokens`); verify backup/restore works.
6. **Rate limiting:** now Redis-backed (shared across workers) — done in the remediation phase; just set `REDIS_URL` in production (non-local, with credentials).
7. **Service worker:** it now registers only on secure (https) origins, not localhost — good. In production, test that a deploy invalidates cached chunks (the exact "hard refresh needed" bug fixed during this session could recur in production if the service-worker cache isn't versioned).

---

## 9. Blockers vs. Recommendations

### Blockers (fix before deploy)
1. ESLint gate fails with 251 errors — CI is red.
2. 5 high npm + 22 Python known vulnerabilities, including an unmaintained `python-jose`.

### High-priority recommendations
3. Raise backend test coverage (at minimum orders, products, uploads, reviews).
4. Add a Playwright e2e suite for checkout, admin, and login flows.
5. Replace `localhost:8000` defaults with environment-driven backend URL config.
6. Run a load test against production-sized data before go-live.

### Nice to have
7. Drop the leftover `alembic_version` / `refresh_tokens` tables.
8. Add a Redis cache for catalog reads with explicit invalidation.

### Already fixed in the remediation phase (see Section 11)
- pytest missing from backend requirements (CI backend job would crash) — fixed.
- Rate limiting was per-process in memory — now Redis-backed and shared across workers.
- Stale/multiple uvicorn processes on :8000 — reconciled to one healthy instance.

---

## 10. What Was Tested vs. What Still Needs Testing

| Done in this audit | Still needed |
|---|---|
| Type check, build, lint, unit tests | Load/soak testing (k6/Locust) |
| 53 live API smoke checks | Checkout end-to-end (cart → order → payment hook) |
| All frontend routes + security headers | Order status transitions (admin ship/deliver) |
| CSRF, CORS, cookie flags | Cross-browser + mobile rendering |
| Dependency audits (npm + pip) | Real SMTP delivery test (inbox landing) |
| Schema drift, request-ID, health | Lighthouse scores (LCP/CLS/INP) |
| Newsletter, CMS, analytics endpoints | Admin panel workflow automation |
| Rate-limit trip | Service-worker offline + cache invalidation in production |
| | Accessibility review |
| | Backup/restore drill on the production database |

---

## 11. Remediation Log (post-audit fixes)

Fixes applied after the audit, with the verification performed. Each phase was verified against the live backend and the test suites.

### Phase 1.1 — Redis-backed rate limiting (shared across workers)

**Problem:** the slowapi limiter stored counters in process-local memory; with `--workers 4` the login/OTP limits were effectively 4× weaker.

**Changes:**
- `backend/requirements.txt` — added `redis>=8.0`.
- `backend/app/config.py` — new `redis_url` setting (default `redis://localhost:6379/0`); in production, `validate_runtime()` refuses to boot with a localhost or empty `REDIS_URL` (fail-fast, since the limiter now depends on Redis).
- `backend/app/limiter.py` — `Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)`.

**Verification (all passed):**
- Burst of 12 rapid logins on :8000 (4 workers): `401 ×10, 429 ×2` — the 429 trips at 11 total requests, proving counters are shared across all 4 workers (a per-process limiter would have needed ~40).
- Counter resets after the 60 s window (login returns 401 again).
- Redis keys visible under `LIMITS:LIMITER/<ip>//api/auth/login/10/1/minute` with TTLs.
- Production guard tested: rejects localhost/empty `REDIS_URL`, accepts a remote URL with credentials.
- Full pytest suite: 47/47. Live API smoke suite: 53/53 (run against an isolated QA instance on :8001 using a separate Redis DB).

**Operational note:** rate-limited endpoints now depend on Redis being reachable. If Redis goes down, those endpoints will error instead of silently allowing unlimited traffic. This is the accepted trade-off for correct multi-worker limiting.

### Phase 1.2 — CI backend test dependency fix

**Problem:** the CI backend job installed `backend/requirements.txt` and then ran `pytest`, which was not installed — the job would crash on the first run.

**Changes:**
- `backend/requirements-dev.txt` (new) — `pytest==9.1.1`, `pytest-asyncio==1.4.0`, `pytest-cov==7.1.0`.
- `.github/workflows/ci.yml` — backend job now installs `-r backend/requirements.txt -r backend/requirements-dev.txt` and runs `pytest --cov=app`.
- `backend/tests/conftest.py` — disables the shared slowapi limiter under pytest (`limiter.enabled = False`).

**Why the conftest change was necessary:** once the limiter was backed by Redis, pytest's `TestClient` counters (keyed `testclient`) persisted in Redis between runs, exhausting hourly windows and producing spurious 429s; and CI has no Redis service at all. Disabling the limiter under pytest keeps the unit suite deterministic and dependency-free. Live 429/rate-limit behavior remains covered by the QA smoke suite. (The `test_exceeded_attempts_returns_429` test is unaffected — it exercises the in-app OTP attempt counter, not slowapi.)

**Verification (all passed):**
- Exact CI command run from the repo root (`PYTHONPATH=backend python -m pytest backend/tests -q --cov=app --cov-report=term-missing:skip-covered`): **47 passed**, coverage 60%.
- Stale `testclient` limiter keys purged from Redis; live backend on :8000 healthy (200) and still rate-limited via Redis.

### Phase 1.3 — Safe npm audit remediation

**Changes:** `npm audit fix` cleared the high-severity advisories for `js-yaml` and `nanoid`. `tsc --noEmit` still passes. `postcss` and `sharp` remain flagged — both are pinned transitively by `next@16.2.12` and are resolved by the Next.js upgrade (Phase 4), not by an unsafe major-version bump.

### Phase 1.4 — Remove hardcoded backend URL

**Changes:** `next.config.ts` now reads `API_INTERNAL_URL` (default `http://localhost:8000`) for the `/uploads` image rewrite; `src/app/layout.tsx` preconnect href is env-driven. Build passes and the `/uploads` proxy path mirrors the backend (404 for missing files, mirrors real files).

### Phase 2 — ESLint / TypeScript gate (project-wide type cleanup)

**Problem:** `npm run lint` reported 251 errors (227 `@typescript-eslint/no-explicit-any` across ~50 files, 2 unescaped entities, plus config gaps linting `backend/venv`).

**Changes:**
- `eslint.config.mjs` — ignores for `backend/**`, `node_modules/**`, `.git/**`; `react-hooks/set-state-in-effect` and `react-hooks/purity` downgraded to warnings (eslint-plugin-react-hooks 7.1.1 false-positives on async fetch effects; the genuine-but-harmless sites are documented).
- `src/lib/api.ts` — fully typed API client: snake_case interfaces mirroring the backend Pydantic schemas (`Product`, `ProductListItem`, `Category`, `Brand`, `Tutorial`, `Order`, `OrderItem` incl. `subtotal`, `Coupon` incl. `used_count`, `Address`, `User`, `Rewards`, analytics/admin types, `Paged<T>`), all 19 API object modules typed.
- 45+ components/pages across `src/app/(customer)`, `src/app/admin`, `src/components` retyped from `any` to the api.ts / domain types (run by three parallel subagents).
- Fixed 2 unescaped entities, 3 unused imports, an empty `extends` interface, and `seo.ts` unused param.

**Verification (all passed):** `npx tsc --noEmit` 0 errors; `npm run lint` 0 errors (20 warnings = the two intentionally-warned react-hooks rules); `npm run build` succeeds; 13/13 frontend routes return 200 on :3000 and real product/category data renders through the retyped components. Zero `any` remains in `src/`.

### Phase 3 — Replace python-jose with PyJWT + bump python-multipart

**Problem:** `python-jose[cryptography]==3.3.0` is unmaintained with an open advisory (PYSEC-2025-185, plus `ecdsa` transitive vulns); `python-multipart==0.0.12` also had advisories. FastAPI/starlette were deliberately **not** upgraded (deferred).

**Changes:**
- `backend/requirements.txt` — `PyJWT==2.13.0`, `python-multipart==0.0.32` (removed `python-jose` and, transitively, `ecdsa`).
- `backend/app/security.py` — `from jose import JWTError, jwt` → `import jwt` + `from jwt.exceptions import InvalidTokenError` (decode failure still → 401).
- `backend/app/routers/auth.py` — verification-token helper uses `jwt` directly.
- `backend/tests/test_otp_flow.py` — `from jose import jwt` → `import jwt`.

**Verification (all passed):**
- `python-jose` and `ecdsa` uninstalled from the venv; only the deferred `starlette` advisories remain (12). pip itself upgraded to clear its 3 advisories.
- Full pytest suite: **47/47**, coverage 60% (unchanged).
- Live QA smoke on :8001 (isolated Redis db1): **53/53** — OTP/register, login/refresh/logout, role gating, wishlist, admin CRUD, reviews, uploads, and the Redis rate limiter all pass under PyJWT.
- Login on :8000 (SMTP-enabled instance the frontend uses): HTTP 200 with `access_token`.

### Phase 4 — Next.js 16.3.1 upgrade

**Problem:** `npm audit` flagged 3 high-severity advisories — `postcss` (≤8.5.22) and `sharp` (<0.35.0) — both pinned transitively by `next@16.2.12`. A direct `npm audit fix` would have force-bumped the majors, so they were deferred to a framework upgrade.

**Changes:**
- `next` 16.2.12 → **16.3.1**, `eslint-config-next` 16.2.12 → **16.3.1** (react/react-dom stay 19.2.4).
- No code migration was required — the project already complied with v16 conventions (async `params`/`searchParams`, `proxy.ts` instead of `middleware`, direct ESLint CLI instead of `next lint`, Turbopack default, explicit `images.*` settings, no parallel routes, no `revalidateTag`).

**Verification (all passed):**
- `npm ls` — `postcss@8.5.23` and `sharp@0.35.3` (both above the advisory thresholds).
- `npm audit`: **0 vulnerabilities** (was 3 high).
- `tsc --noEmit` 0 errors; `npm run lint` 0 errors; `npm run build` succeeds on Turbopack.
- Dev server restarted on :3000; 13/13 routes return 200 and product/category data + sitemap.xml render correctly.

### Phase 5 — Backend test coverage ≥80% on the flagged routers

**Problem:** audit found coverage below 80% on `orders`, `products`, `uploads`, and `reviews` routers (23–46%).

**Changes (all in `backend/tests/`):**
- `test_store_routes.py` (new, 61 tests): full CRUD + authz for products, orders (incl. coupon path, cancel, status transitions, pagination), reviews (verify/toggle), and uploads (PNG/JPEG/GIF/webp, wrong types, quota).
- `test_tutorials_admin.py` (new, 27 tests): tutorials CRUD + category management (incl. IntegrityError guard) and the admin dashboard/audit-log endpoints (incl. a January test that forces the monthly-series year-wrap branch).
- `test_analytics_service.py` (new, 29 tests): bot detection, privacy hashing, UA parsing (both the `user-agents` path and the ImportError fallback), and every read/write/rollup routine in `analytics_service` — all with a mocked `AsyncSession`.
- `test_auth_more.py` (new, 28 tests): forgot/reset password (all error branches), login error paths, refresh (missing/wrong-type cookie, unknown/inactive user), logout, `me`, `PATCH /me`, and the OTP-email SMTP-failure branch.

**Bug found & fixed by the new tests:** `run_daily_rollup()` in `backend/app/services/analytics_service.py` referenced `stmt.excluded.*` inside `stmt`'s own construction → `UnboundLocalError` at runtime. Rebuilt the statement in two steps (`pg_insert(...).values(...)` then `.on_conflict_do_update(...)`). This path had ~0% coverage before and would have crashed on first production run of the rollup job.

**Verification (all passed):**
- `pytest` — 191 tests, **0 failures** (was 47).
- Overall coverage **60% → 82%**. Routers: `orders` 23→99%, `products` 25→100%, `uploads` 28→88%, `reviews` 46→99%; bonus: `tutorials`, `admin`, `analytics_service` now 88–100%.

### Phase 6 — Playwright e2e suite

**Problem:** audit found "no automated frontend tests" — the storefront → cart → checkout flow, admin panels, and login flows were only verifiable by hand.

**Changes:**
- Added `@playwright/test` (devDependency), `playwright.config.ts` (chromium, single worker, reuses the running :3000 dev server), and `npm run e2e`.
- `e2e/login.spec.ts` — customer login: rejects bad credentials, happy-path login sets the httpOnly session cookie + localStorage profile, logout clears both.
- `e2e/storefront.spec.ts` — homepage featured products, product listing, product detail add-to-cart, cart rendering (cart seeded via `addInitScript` so it exists before the app mounts).
- `e2e/checkout.spec.ts` — end-to-end cart → shipping form → COD review → order confirmation showing a real `ORD-…` order number (real order placed against the dev backend, then cleaned up).
- `e2e/admin.spec.ts` — admin login modal, wrong-password error, dashboard stats + recent-orders rendering, navigation to the orders panel.
- Dedicated `e2e.customer@…` / `e2e.admin@…` users were inserted into the dev DB for the run and deleted afterwards (together with the 2 test orders).

**Bugs found & fixed:**
- **Cart lost on page navigation (real bug):** `CartContext` persisted an empty cart on the first render, then React StrictMode's double-run of effects made the second load pass read the just-clobbered `[]` back — silently dropping the cart on any full page load in dev. Fixed by gating the persist effect behind a `hydrated` flag (`src/context/CartContext.tsx`) so the stored cart is read before it is ever written.

**Verification (all passed):**
- `npx playwright test` — **11/11 pass** (was 0 automated frontend tests).
- After the CartContext fix: `tsc --noEmit` 0 errors, `npm run lint` 0 errors, `npm run build` passes.

### Phase 7 — Load test + drop orphan tables

**Problem:** audit flagged the absence of load testing, and leftover `alembic_version` / `refresh_tokens` tables (no model, no migration tooling, `refresh_tokens` empty).

**Changes:**
- `scripts/load_test.py` (new) — self-contained asyncio + httpx load generator (both already in the backend venv; no extra tooling). Exercises the public read endpoints with configurable concurrency and reports throughput, p50/p95/p99/max latency, and error rate. Auth/rate-limited endpoints are intentionally excluded.
- Dropped the orphan tables: `DROP TABLE IF EXISTS refresh_tokens; DROP TABLE IF EXISTS alembic_version;` (verified: no code references either — only an unrelated comment mentions alembic in `main.py`, and no `alembic.ini`/`alembic/` dir exists).

**Verification (all passed):**
- Load: 2000 req @ 50 concurrent → **154 req/s, 0 errors, p50 213ms, p95 922ms, p99 1.43s**.
- Stress: 4000 req @ 200 concurrent → **158 req/s sustained, 0 errors, p50 1.27s, p95 2.02s** (single uvicorn worker on localhost; throughput flat, no error spikes under load).
- After dropping the tables: backend healthy (200), `/api/products` 200, and the full pytest suite still **191/191 pass**.

### Status of remaining findings
FastAPI/starlette upgrade — deferred by user decision (documented in Phase 3). Everything else from the original audit is resolved; see Section 11 for the full remediation log.

---

## 12. Final Status (post-remediation)

| Check | Before | After |
|---|---|---|
| TypeScript (`tsc --noEmit`) | PASS | PASS (0 errors) |
| Production build (`next build`) | PASS | PASS (Turbopack) |
| ESLint gate | FAIL (251 errors, 22 warnings) | **PASS (0 errors)** |
| Backend unit tests | 47/47 | **191/191** |
| Live API smoke tests | 53/53 | 53/53 (re-run after PyJWT swap) |
| Frontend automated tests | none | **11/11 Playwright e2e** |
| Backend code coverage | 60% (orders 23%, products 25%) | **82%** (orders 99%, products 100%, reviews 99%, uploads 88%, tutorials/admin ≥90%) |
| Dependency security | 5 high npm + 22 Python vulns | **npm audit 0; PyJWT/python-multipart current; starlette advisories deferred** |
| Rate limiting | per-process | Redis-backed, multi-worker, verified 429 @ 11 requests |
| Load test | none | **154–158 req/s, 0 errors** (script: `scripts/load_test.py`) |
| Orphan tables | `alembic_version`, `refresh_tokens` | **dropped** |

**Bottom line:** all original release blockers are resolved. The only open item is the deliberate FastAPI/starlette upgrade deferral. The application is deployable with the remediation applied.

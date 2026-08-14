/**
 * Central API client — all calls go through the Next.js proxy route /api/*
 * which forwards them to FastAPI at localhost:8000.
 *
 * On the server (RSC) we call the internal URL directly.
 * On the client we use relative /api/* paths (handled by Next.js proxy).
 *
 * Auth: sessions are httpOnly cookies (access_token / refresh_token) set by
 * the backend on login/register/refresh. The browser attaches them to /api/*
 * requests and the proxy forwards the Cookie header, so the Authorization
 * header is not needed. The `token` argument is accepted for compatibility
 * with existing call sites but is intentionally ignored.
 */

const BASE =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? "http://localhost:8000")
    : "";

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string; next?: { revalidate?: number } }
): Promise<T> {
  const isServer = typeof window === "undefined";
  const url = isServer ? `${BASE}/api/${path}` : `/api/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, {
    ...init,
    headers,
    // `cache` and `next.revalidate` are mutually exclusive — on the server,
    // let Next.js drive caching via `revalidate` (force-cache). On the client
    // `next` is meaningless, so never force-cache: `force-cache` makes the
    // browser serve its HTTP cache even when stale (responses lack cache
    // headers), which caused the admin edit form to show pre-save data.
    cache: init?.cache ?? (isServer && init?.next?.revalidate != null ? "force-cache" : "no-store"),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const e = new Error(err.detail ?? `API error ${res.status}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  /** Step 1: request an OTP for the given email. */
  requestOtp: (body: { email: string }): Promise<{ message: string; dev_otp?: string }> =>
    apiFetch("auth/request-otp", { method: "POST", body: JSON.stringify(body) }),

  /** Step 2: verify the OTP — returns a short-lived verification_token. */
  verifyOtp: (body: { email: string; otp: string }): Promise<{ verification_token: string; email: string }> =>
    apiFetch("auth/verify-otp", { method: "POST", body: JSON.stringify(body) }),

  /** Step 3: complete registration using the verification_token from step 2. */
  register: (body: { name: string; email: string; password: string; verification_token: string }) =>
    apiFetch("auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    apiFetch("auth/login", { method: "POST", body: JSON.stringify(body) }),

  /** Request a password-reset OTP (returns dev_otp only in dev, no SMTP). */
  forgotPassword: (body: { email: string }): Promise<{ message: string; dev_otp?: string }> =>
    apiFetch("auth/forgot-password", { method: "POST", body: JSON.stringify(body) }),

  /** Set a new password using the emailed OTP. */
  resetPassword: (body: { email: string; otp: string; new_password: string }): Promise<{ message: string }> =>
    apiFetch("auth/reset-password", { method: "POST", body: JSON.stringify(body) }),

  me: (): Promise<any> =>
    apiFetch("auth/me"),

  updateMe: (body: { name?: string; phone?: string; avatar?: string; address?: object; password?: string }) =>
    apiFetch("auth/me", { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: (): Promise<any[]> => apiFetch("categories", { next: { revalidate: 60 } }),
  create: (body: any, token: string) =>
    apiFetch("categories", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: any, token: string) =>
    apiFetch(`categories/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`categories/${id}`, { method: "DELETE", token }),
};

// ─── Brands ───────────────────────────────────────────────────────────────────

export const brandsApi = {
  list: (): Promise<any[]> => apiFetch("brands", { next: { revalidate: 60 } }),
  create: (body: any, token: string) =>
    apiFetch("brands", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: any, token: string) =>
    apiFetch(`brands/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`brands/${id}`, { method: "DELETE", token }),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  featured?: boolean;
  in_stock?: boolean;
  page?: number;
  page_size?: number;
}

export const productsApi = {
  list: (
    filters: ProductFilters = {},
    init?: RequestInit & { next?: { revalidate?: number } }
  ): Promise<{ items: any[]; total: number; page: number; page_size: number }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch(`products${qs ? "?" + qs : ""}`, { next: { revalidate: 60 }, ...init });
  },
  get: (slug: string): Promise<any> => apiFetch(`products/${slug}`, { next: { revalidate: 60 } }),
  getById: (id: string): Promise<any> => apiFetch(`products/id/${id}`, { next: { revalidate: 60 } }),
  create: (body: any, token: string) =>
    apiFetch("products", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: any, token: string) =>
    apiFetch(`products/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`products/${id}`, { method: "DELETE", token }),
  addReview: (id: string, body: any, token: string) =>
    apiFetch(`products/${id}/reviews`, { method: "POST", body: JSON.stringify(body), token }),
};

// ─── Tutorials ────────────────────────────────────────────────────────────────

export interface TutorialFilters {
  category?: string;
  difficulty?: string;
  featured?: boolean;
  published?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export const tutorialsApi = {
  list: (filters: TutorialFilters = {}): Promise<{ items: any[]; total: number; page: number; page_size: number }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch(`tutorials${qs ? "?" + qs : ""}`, { next: { revalidate: 60 } });
  },
  get: (slug: string): Promise<any> => apiFetch(`tutorials/${slug}`, { next: { revalidate: 60 } }),
  categories: (): Promise<any[]> => apiFetch("tutorials/categories"),
  createCategory: (body: any, token: string): Promise<any> =>
    apiFetch("tutorials/categories", { method: "POST", body: JSON.stringify(body), token }),
  updateCategory: (id: string, body: any, token: string): Promise<any> =>
    apiFetch(`tutorials/categories/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  deleteCategory: (id: string, token: string): Promise<void> =>
    apiFetch(`tutorials/categories/${id}`, { method: "DELETE", token }),
  create: (body: any, token: string) =>
    apiFetch("tutorials", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: any, token: string) =>
    apiFetch(`tutorials/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`tutorials/${id}`, { method: "DELETE", token }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (token: string, params?: { page?: number; page_size?: number; status?: string; search?: string }): Promise<any> => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.page_size !== undefined) qs.set("page_size", String(params.page_size));
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return apiFetch(`orders${q ? "?" + q : ""}`, { token });
  },
  get: (id: string, token: string): Promise<any> =>
    apiFetch(`orders/${id}`, { token }),
  create: (body: any, token: string) =>
    apiFetch("orders", { method: "POST", body: JSON.stringify(body), token }),
  cancel: (id: string, token: string): Promise<any> =>
    apiFetch(`orders/${id}/cancel`, { method: "PATCH", token }),
  updateStatus: (id: string, status: string, token: string) =>
    apiFetch(`orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), token }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (token: string, params?: { page?: number; page_size?: number; search?: string }): Promise<any> => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.page_size !== undefined) qs.set("page_size", String(params.page_size));
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return apiFetch(`users${q ? "?" + q : ""}`, { token });
  },
};

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const couponsApi = {
  list: (token: string): Promise<any[]> => apiFetch("coupons", { token }),
  create: (body: any, token: string): Promise<any> => apiFetch("coupons", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: any, token: string): Promise<any> => apiFetch(`coupons/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string): Promise<void> => apiFetch(`coupons/${id}`, { method: "DELETE", token }),
  validate: (body: { code: string; subtotal: number }): Promise<{ valid: boolean; discount?: number; message?: string; code?: string }> =>
    apiFetch("coupons/validate", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewsApi = {
  list: (token: string, params?: { verified?: boolean; search?: string }): Promise<any[]> => {
    const qs = new URLSearchParams();
    if (params?.verified !== undefined) qs.set("verified", String(params.verified));
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return apiFetch(`reviews${q ? "?" + q : ""}`, { token });
  },
  update: (id: string, body: { rating?: number; title?: string; body?: string }, token: string): Promise<any> =>
    apiFetch(`reviews/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
  verify: (id: string, token: string): Promise<any> =>
    apiFetch(`reviews/${id}/verify`, { method: "PATCH", token }),
  delete: (id: string, token: string): Promise<void> =>
    apiFetch(`reviews/${id}`, { method: "DELETE", token }),
};

// ─── Contact ──────────────────────────────────────────────────────────────────

export const contactApi = {
  submit: (body: { name: string; email: string; subject: string; message: string }): Promise<any> =>
    apiFetch("contact", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsApi = {
  get: (token?: string): Promise<{ settings: Record<string, string> }> =>
    apiFetch("settings", token ? { token } : {}),
  save: (settings: Record<string, string>, token: string): Promise<{ settings: Record<string, string> }> =>
    apiFetch("settings", { method: "PUT", body: JSON.stringify({ settings }), token }),
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadApi = {
  upload: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? `Upload failed ${res.status}`);
    }
    return res.json();
  },
};

// ─── CMS ──────────────────────────────────────────────────────────────────────

export const cmsApi = {
  list: (): Promise<any[]> => apiFetch("cms/pages", { next: { revalidate: 60 } }),
  delete: (id: string, token: string): Promise<any> =>
    apiFetch(`cms/pages/${id}`, { method: "DELETE", token }),
};

// ─── Admin dashboard ──────────────────────────────────────────────────────────

export const adminApi = {
  dashboard: (token: string): Promise<any> =>
    apiFetch("admin/dashboard", { token }),
};

// ─── Newsletter ───────────────────────────────────────────────────────────────

export const newsletterApi = {
  subscribe: (email: string): Promise<any> =>
    apiFetch("newsletter/subscribe", { method: "POST", body: JSON.stringify({ email }) }),
};

// ─── Wishlist ────────────────────────────────────────────────────────────────

export const wishlistApi = {
  list: (token: string): Promise<any[]> =>
    apiFetch("wishlist", { token }),
  add: (productId: string, token: string): Promise<any> =>
    apiFetch(`wishlist/${productId}`, { method: "POST", token }),
  remove: (productId: string, token: string): Promise<void> =>
    apiFetch(`wishlist/${productId}`, { method: "DELETE", token }),
};

// ─── Addresses ────────────────────────────────────────────────────────────────

export const addressesApi = {
  list: (token: string): Promise<any[]> =>
    apiFetch("addresses", { token }),
  create: (body: any, token: string): Promise<any> =>
    apiFetch("addresses", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: any, token: string): Promise<any> =>
    apiFetch(`addresses/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string): Promise<void> =>
    apiFetch(`addresses/${id}`, { method: "DELETE", token }),
};

// ─── Rewards ──────────────────────────────────────────────────────────────────

export const rewardsApi = {
  get: (token: string): Promise<any> =>
    apiFetch("rewards", { token }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  summary: (token: string): Promise<any> =>
    apiFetch('analytics/summary', { token }),

  topPages: (token: string, limit = 10): Promise<any[]> =>
    apiFetch(`analytics/top-pages?limit=${limit}`, { token }),

  devices: (token: string): Promise<any[]> =>
    apiFetch('analytics/devices', { token }),

  browsers: (token: string): Promise<any[]> =>
    apiFetch('analytics/browsers', { token }),

  countries: (token: string): Promise<any[]> =>
    apiFetch('analytics/countries', { token }),

  trend: (token: string, days = 30): Promise<any[]> =>
    apiFetch(`analytics/trend?days=${days}`, { token }),
};
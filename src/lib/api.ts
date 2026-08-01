/**
 * Central API client — all calls go through the Next.js proxy route /api/*
 * which forwards them to FastAPI at localhost:8000.
 *
 * On the server (RSC) we call the internal URL directly.
 * On the client we use relative /api/* paths (handled by Next.js proxy).
 */

const BASE =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? "http://localhost:8000")
    : "";

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const url = typeof window === "undefined"
    ? `${BASE}/api/${path}`
    : `/api/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, {
    ...init,
    headers,
    cache: init?.cache ?? "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    apiFetch("auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    apiFetch("auth/login", { method: "POST", body: JSON.stringify(body) }),

  me: (token: string) =>
    apiFetch("auth/me", { token }),

  logout: () =>
    apiFetch("auth/logout", { method: "POST" }),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: (): Promise<any[]> => apiFetch("categories"),
  get: (slug: string): Promise<any> => apiFetch(`categories/${slug}`),
  create: (body: any, token: string) =>
    apiFetch("categories", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: any, token: string) =>
    apiFetch(`categories/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`categories/${id}`, { method: "DELETE", token }),
};

// ─── Brands ───────────────────────────────────────────────────────────────────

export const brandsApi = {
  list: (): Promise<any[]> => apiFetch("brands"),
  get: (slug: string): Promise<any> => apiFetch(`brands/${slug}`),
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
  list: (filters: ProductFilters = {}): Promise<{ items: any[]; total: number; page: number; page_size: number }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch(`products${qs ? "?" + qs : ""}`);
  },
  get: (slug: string): Promise<any> => apiFetch(`products/${slug}`),
  getById: (id: string): Promise<any> => apiFetch(`products/id/${id}`),
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
    return apiFetch(`tutorials${qs ? "?" + qs : ""}`);
  },
  get: (slug: string): Promise<any> => apiFetch(`tutorials/${slug}`),
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
  list: (token: string): Promise<any[]> =>
    apiFetch("orders", { token }),
  get: (id: string, token: string): Promise<any> =>
    apiFetch(`orders/${id}`, { token }),
  create: (body: any, token: string) =>
    apiFetch("orders", { method: "POST", body: JSON.stringify(body), token }),
  updateStatus: (id: string, status: string, token: string) =>
    apiFetch(`orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), token }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (token: string): Promise<any[]> =>
    apiFetch("users", { token }),
  get: (id: string, token: string): Promise<any> =>
    apiFetch(`users/${id}`, { token }),
  update: (id: string, body: any, token: string): Promise<any> =>
    apiFetch(`users/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
  delete: (id: string, token: string): Promise<void> =>
    apiFetch(`users/${id}`, { method: "DELETE", token }),
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadApi = {
  upload: async (file: File, token: string): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
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
  list: (): Promise<any[]> => apiFetch("cms/pages"),
  get: (id: string): Promise<any> => apiFetch(`cms/pages/${id}`),
  getBySlug: (slug: string): Promise<any> => apiFetch(`cms/pages/slug/${slug}`),
  create: (body: any, token: string) =>
    apiFetch("cms/pages", { method: "POST", body: JSON.stringify(body), token }),
  save: (id: string, body: any, token: string) =>
    apiFetch(`cms/pages/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`cms/pages/${id}`, { method: "DELETE", token }),
};

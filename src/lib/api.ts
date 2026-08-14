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
 *
 * Types mirror the backend Pydantic schemas in backend/app/schemas/.
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

// ─── Shared domain types (mirror backend Pydantic schemas) ──────────────────

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  product_count: number;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  created_at: string;
}

export interface ReviewAdmin extends Review {
  product_name: string;
  product_slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  price: number;
  original_price: number | null;
  currency: string;
  images: string[];
  tags: string[];
  specs: Record<string, unknown>[];
  stock: number;
  rating: number;
  review_count: number;
  featured: boolean;
  new_arrival: boolean;
  best_seller: boolean;
  in_stock: boolean;
  weight: string | null;
  dimensions: string | null;
  related_product_ids: string[];
  category: Category | null;
  brand: Brand | null;
  reviews: Review[];
  created_at: string;
  updated_at: string;
}

export type ProductListItem = Omit<Product, "description" | "reviews">;

export interface ProductCreateInput {
  name: string;
  slug: string;
  sku: string;
  description?: string;
  short_description?: string;
  price: number;
  original_price?: number | null;
  currency?: string;
  images?: string[];
  tags?: string[];
  specs?: Record<string, unknown>[];
  stock?: number;
  featured?: boolean;
  new_arrival?: boolean;
  best_seller?: boolean;
  in_stock?: boolean;
  weight?: string | null;
  dimensions?: string | null;
  related_product_ids?: string[];
  category_id: string;
  brand_id?: string | null;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

export interface TutorialCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Tutorial {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  difficulty: string;
  estimated_time: string;
  components: string[];
  sensors: string[];
  microcontrollers: string[];
  circuit_diagram: string | null;
  wiring_instructions: Record<string, unknown>[];
  source_code: string;
  code_language: string;
  steps: Record<string, unknown>[];
  prerequisites: string[];
  learning_outcomes: string[];
  related_product_ids: string[];
  related_tutorial_ids: string[];
  cover_image: string;
  views: number;
  featured: boolean;
  published: boolean;
  author: string;
  tags: string[];
  category: TutorialCategory | null;
  created_at: string;
  updated_at: string;
}

export interface TutorialCreateInput {
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  difficulty?: string;
  estimated_time?: string;
  components?: string[];
  sensors?: string[];
  microcontrollers?: string[];
  circuit_diagram?: string | null;
  wiring_instructions?: Record<string, unknown>[];
  source_code?: string;
  code_language?: string;
  steps?: Record<string, unknown>[];
  prerequisites?: string[];
  learning_outcomes?: string[];
  related_product_ids?: string[];
  related_tutorial_ids?: string[];
  cover_image?: string;
  featured?: boolean;
  published?: boolean;
  author?: string;
  tags?: string[];
  category_id: string;
}

export type TutorialUpdateInput = Partial<TutorialCreateInput>;

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_email: string | null;
  items: OrderItem[];
  shipping_address: Record<string, string>;
  status: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  coupon_code: string | null;
  total: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderCreateInput {
  items: { product_id: string; product_name?: string; product_image?: string; quantity: number }[];
  shipping_address: {
    first_name: string;
    last_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip_code?: string;
    country?: string;
  };
  payment_method?: string;
  notes?: string | null;
  coupon_code?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  phone: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  percent_off: number | null;
  fixed_amount: number | null;
  min_subtotal: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  used_count: number;
}

export interface CouponInput {
  code: string;
  description?: string;
  percent_off?: number | null;
  fixed_amount?: number | null;
  min_subtotal?: number;
  max_uses?: number | null;
  max_uses_per_user?: number | null;
  active?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface AddressInput {
  label?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code?: string;
  country?: string;
  is_default?: boolean;
}

export type AddressUpdateInput = Partial<AddressInput>;

export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  block_count: number;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed: boolean;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product: Product;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  points: number;
  description: string;
  order_id: string | null;
  created_at: string;
}

export interface Rewards {
  balance: number;
  history: RewardTransaction[];
}

export interface AnalyticsSummary {
  visitors_today: number;
  visitors_this_week: number;
  visitors_this_month: number;
  total_visitors: number;
  page_views_today: number;
  page_views_total: number;
  online_now: number;
}

export interface TopPage {
  path: string;
  views: number;
  unique_visitors: number;
}

export interface DeviceBreakdown {
  device_type: string;
  count: number;
}

export interface BrowserBreakdown {
  browser: string;
  count: number;
}

export interface CountryBreakdown {
  country: string;
  count: number;
}

export interface DailyTrend {
  day: string;
  unique_visitors: number;
  page_views: number;
}

export interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  total_products: number;
  revenue_change: number;
  orders_change: number;
  customers_change: number;
}

export interface DashboardMonthly {
  label: string;
  value: number;
}

export interface DashboardTopProduct {
  name: string;
  sold: number;
  revenue: number;
}

export interface AdminDashboard {
  stats: DashboardStats;
  monthly_revenue: DashboardMonthly[];
  top_products: DashboardTopProduct[];
  recent_orders: Order[];
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

  me: (): Promise<User> =>
    apiFetch("auth/me"),

  updateMe: (body: { name?: string; phone?: string; avatar?: string; address?: Record<string, string>; password?: string }) =>
    apiFetch("auth/me", { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: (): Promise<Category[]> => apiFetch("categories", { next: { revalidate: 60 } }),
  create: (body: { name: string; slug: string; description?: string; image?: string }, token: string) =>
    apiFetch("categories", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: { name?: string; slug?: string; description?: string; image?: string }, token: string) =>
    apiFetch(`categories/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`categories/${id}`, { method: "DELETE", token }),
};

// ─── Brands ───────────────────────────────────────────────────────────────────

export const brandsApi = {
  list: (): Promise<Brand[]> => apiFetch("brands", { next: { revalidate: 60 } }),
  create: (body: { name: string; slug: string; logo?: string }, token: string) =>
    apiFetch("brands", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: { name?: string; slug?: string; logo?: string }, token: string) =>
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
  ): Promise<Paged<ProductListItem>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch(`products${qs ? "?" + qs : ""}`, { next: { revalidate: 60 }, ...init });
  },
  get: (slug: string): Promise<Product> => apiFetch(`products/${slug}`, { next: { revalidate: 60 } }),
  getById: (id: string): Promise<Product> => apiFetch(`products/id/${id}`, { next: { revalidate: 60 } }),
  create: (body: ProductCreateInput, token: string) =>
    apiFetch("products", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: ProductUpdateInput, token: string) =>
    apiFetch(`products/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`products/${id}`, { method: "DELETE", token }),
  addReview: (id: string, body: { rating: number; title: string; body?: string }, token: string) =>
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
  list: (filters: TutorialFilters = {}): Promise<Paged<Tutorial>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch(`tutorials${qs ? "?" + qs : ""}`, { next: { revalidate: 60 } });
  },
  get: (slug: string): Promise<Tutorial> => apiFetch(`tutorials/${slug}`, { next: { revalidate: 60 } }),
  categories: (): Promise<TutorialCategory[]> => apiFetch("tutorials/categories"),
  createCategory: (body: { name: string; slug: string; description?: string; icon?: string }, token: string): Promise<TutorialCategory> =>
    apiFetch("tutorials/categories", { method: "POST", body: JSON.stringify(body), token }),
  updateCategory: (id: string, body: { name?: string; slug?: string; description?: string; icon?: string }, token: string): Promise<TutorialCategory> =>
    apiFetch(`tutorials/categories/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  deleteCategory: (id: string, token: string): Promise<void> =>
    apiFetch(`tutorials/categories/${id}`, { method: "DELETE", token }),
  create: (body: TutorialCreateInput, token: string) =>
    apiFetch("tutorials", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: TutorialUpdateInput, token: string) =>
    apiFetch(`tutorials/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`tutorials/${id}`, { method: "DELETE", token }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (token: string, params?: { page?: number; page_size?: number; status?: string; search?: string }): Promise<Order[]> => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.page_size !== undefined) qs.set("page_size", String(params.page_size));
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return apiFetch(`orders${q ? "?" + q : ""}`, { token });
  },
  get: (id: string, token: string): Promise<Order> =>
    apiFetch(`orders/${id}`, { token }),
  create: (body: OrderCreateInput, token: string) =>
    apiFetch("orders", { method: "POST", body: JSON.stringify(body), token }),
  cancel: (id: string, token: string): Promise<Order> =>
    apiFetch(`orders/${id}/cancel`, { method: "PATCH", token }),
  updateStatus: (id: string, status: string, token: string) =>
    apiFetch(`orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), token }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (token: string, params?: { page?: number; page_size?: number; search?: string }): Promise<User[]> => {
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
  list: (token: string): Promise<Coupon[]> => apiFetch("coupons", { token }),
  create: (body: CouponInput, token: string): Promise<Coupon> => apiFetch("coupons", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: CouponInput, token: string): Promise<Coupon> => apiFetch(`coupons/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string): Promise<void> => apiFetch(`coupons/${id}`, { method: "DELETE", token }),
  validate: (body: { code: string; subtotal: number }): Promise<{ valid: boolean; discount?: number; message?: string; code?: string }> =>
    apiFetch("coupons/validate", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewsApi = {
  list: (token: string, params?: { verified?: boolean; search?: string }): Promise<ReviewAdmin[]> => {
    const qs = new URLSearchParams();
    if (params?.verified !== undefined) qs.set("verified", String(params.verified));
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return apiFetch(`reviews${q ? "?" + q : ""}`, { token });
  },
  update: (id: string, body: { rating?: number; title?: string; body?: string }, token: string): Promise<Review> =>
    apiFetch(`reviews/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
  verify: (id: string, token: string): Promise<ReviewAdmin> =>
    apiFetch(`reviews/${id}/verify`, { method: "PATCH", token }),
  delete: (id: string, token: string): Promise<void> =>
    apiFetch(`reviews/${id}`, { method: "DELETE", token }),
};

// ─── Contact ──────────────────────────────────────────────────────────────────

export const contactApi = {
  submit: (body: { name: string; email: string; subject: string; message: string }): Promise<{ message: string }> =>
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
  list: (): Promise<CMSPage[]> => apiFetch("cms/pages", { next: { revalidate: 60 } }),
  delete: (id: string, token: string): Promise<{ message: string }> =>
    apiFetch(`cms/pages/${id}`, { method: "DELETE", token }),
};

// ─── Admin dashboard ──────────────────────────────────────────────────────────

export const adminApi = {
  dashboard: (token: string): Promise<AdminDashboard> =>
    apiFetch("admin/dashboard", { token }),
};

// ─── Newsletter ───────────────────────────────────────────────────────────────

export const newsletterApi = {
  subscribe: (email: string): Promise<NewsletterSubscriber> =>
    apiFetch("newsletter/subscribe", { method: "POST", body: JSON.stringify({ email }) }),
};

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const wishlistApi = {
  list: (token: string): Promise<WishlistItem[]> =>
    apiFetch("wishlist", { token }),
  add: (productId: string, token: string): Promise<WishlistItem> =>
    apiFetch(`wishlist/${productId}`, { method: "POST", token }),
  remove: (productId: string, token: string): Promise<void> =>
    apiFetch(`wishlist/${productId}`, { method: "DELETE", token }),
};

// ─── Addresses ────────────────────────────────────────────────────────────────

export const addressesApi = {
  list: (token: string): Promise<Address[]> =>
    apiFetch("addresses", { token }),
  create: (body: AddressInput, token: string): Promise<Address> =>
    apiFetch("addresses", { method: "POST", body: JSON.stringify(body), token }),
  update: (id: string, body: AddressUpdateInput, token: string): Promise<Address> =>
    apiFetch(`addresses/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  delete: (id: string, token: string): Promise<void> =>
    apiFetch(`addresses/${id}`, { method: "DELETE", token }),
};

// ─── Rewards ──────────────────────────────────────────────────────────────────

export const rewardsApi = {
  get: (token: string): Promise<Rewards> =>
    apiFetch("rewards", { token }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  summary: (token: string): Promise<AnalyticsSummary> =>
    apiFetch('analytics/summary', { token }),

  topPages: (token: string, limit = 10): Promise<TopPage[]> =>
    apiFetch(`analytics/top-pages?limit=${limit}`, { token }),

  devices: (token: string): Promise<DeviceBreakdown[]> =>
    apiFetch('analytics/devices', { token }),

  browsers: (token: string): Promise<BrowserBreakdown[]> =>
    apiFetch('analytics/browsers', { token }),

  countries: (token: string): Promise<CountryBreakdown[]> =>
    apiFetch('analytics/countries', { token }),

  trend: (token: string, days = 30): Promise<DailyTrend[]> =>
    apiFetch(`analytics/trend?days=${days}`, { token }),
};

// ─── Product Types ────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface ProductReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  title: string;
  body: string;
  date: string;
  verified: boolean;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  category: Category;
  brand: Brand;
  tags: string[];
  specs: ProductSpec[];
  stock: number;
  rating: number;
  reviewCount: number;
  reviews: ProductReview[];
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  inStock: boolean;
  weight?: string;
  dimensions?: string;
  relatedProductIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Tutorial Types ───────────────────────────────────────────────────────────

export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

export interface TutorialStep {
  stepNumber: number;
  title: string;
  content: string;
  image?: string;
  code?: string;
  language?: string;
}

export interface WiringPin {
  component: string;
  pin: string;
  microcontrollerPin: string;
  description?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  difficulty: DifficultyLevel;
  estimatedTime: string; // e.g. "2-3 hours"
  category: TutorialCategory;
  components: string[];
  sensors: string[];
  microcontrollers: string[];
  circuitDiagram?: string;
  wiringInstructions: WiringPin[];
  sourceCode: string;
  codeLanguage: string;
  steps: TutorialStep[];
  prerequisites: string[];
  learningOutcomes: string[];
  relatedProductIds: string[];
  relatedTutorialIds: string[];
  coverImage: string;
  views: number;
  featured: boolean;
  published: boolean;
  author: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TutorialCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  tutorialCount?: number;
}

// ─── Cart & Order Types ───────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User Types ───────────────────────────────────────────────────────────────

export type UserRole = "customer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  address?: ShippingAddress;
  createdAt: string;
  orderCount?: number;
  totalSpent?: number;
}

// ─── Banner Types ─────────────────────────────────────────────────────────────

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  active: boolean;
  order: number;
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface ProductFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  search?: string;
  sortBy?: "price-asc" | "price-desc" | "rating" | "newest" | "popular";
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  recentOrders: Order[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

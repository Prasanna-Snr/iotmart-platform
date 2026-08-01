import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  CURRENCY_SYMBOL,
  SHIPPING_COST,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
} from "./constants";

// ─── CSS Class Utility ────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

export function formatPrice(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}

export function calculateDiscount(
  original: number,
  discounted: number
): number {
  return Math.round(((original - discounted) / original) * 100);
}

// ─── Order Calculations ───────────────────────────────────────────────────────

export function calculateSubtotal(
  items: Array<{ price: number; quantity: number }>
): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

export function calculateTax(subtotal: number): number {
  return parseFloat((subtotal * TAX_RATE).toFixed(2));
}

export function calculateTotal(subtotal: number): number {
  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  return parseFloat((subtotal + shipping + tax).toFixed(2));
}

// ─── Slug & String Utilities ──────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ─── Rating Utilities ─────────────────────────────────────────────────────────

export function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return "Excellent";
  if (rating >= 4.0) return "Very Good";
  if (rating >= 3.0) return "Good";
  if (rating >= 2.0) return "Fair";
  return "Poor";
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function paginate<T>(
  items: T[],
  page: number,
  perPage: number
): { items: T[]; totalPages: number; total: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return { items: items.slice(start, end), totalPages, total };
}

// ─── Order Number Generator ───────────────────────────────────────────────────

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IOT-${timestamp}-${random}`;
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-()]{10,}$/.test(phone);
}

// ─── Array Utilities ──────────────────────────────────────────────────────────

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// ─── Number Formatting ────────────────────────────────────────────────────────

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

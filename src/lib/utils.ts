import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  CURRENCY_SYMBOL,
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
} from "./constants";

// ─── CSS Class Utility ────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

export function formatPrice(amount: number): string {
  // No decimal places for Rupees (Rs. 250 not Rs. 250.00)
  return `${CURRENCY_SYMBOL}${Math.round(amount).toLocaleString()}`;
}

export function calculateDiscount(
  original: number,
  discounted: number
): number {
  return Math.round(((original - discounted) / original) * 100);
}

// ─── Order Calculations ───────────────────────────────────────────────────────

export function calculateShipping(
  subtotal: number,
  freeShippingThreshold = FREE_SHIPPING_THRESHOLD,
  shippingCost = SHIPPING_COST
): number {
  return subtotal >= freeShippingThreshold ? 0 : shippingCost;
}

export function calculateTotal(
  subtotal: number,
  freeShippingThreshold = FREE_SHIPPING_THRESHOLD,
  shippingCost = SHIPPING_COST
): number {
  const shipping = calculateShipping(subtotal, freeShippingThreshold, shippingCost);
  return parseFloat((subtotal + shipping).toFixed(2));
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

// ─── Validation Helpers ───────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Number Formatting ────────────────────────────────────────────────────────

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

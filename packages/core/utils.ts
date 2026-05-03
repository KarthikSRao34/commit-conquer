// packages/core/utils.ts

import { type ApiError, type PaginatedResponse } from "./types";

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Convert cents to formatted dollar string
 * formatMoney(2999) → "$29.99"
 */
export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Convert dollar string/number to cents
 * toCents("29.99") → 2999
 */
export function toCents(dollars: number | string): number {
  return Math.round(parseFloat(String(dollars)) * 100);
}

// ─── String ───────────────────────────────────────────────────────────────────

/**
 * Convert a product title to a URL-safe handle
 * toHandle("Obsidian Crew Neck!") → "obsidian-crew-neck"
 */
export function toHandle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate a string to maxLength, appending "…" if cut
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

// ─── Date ─────────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string to human-readable
 * formatDate("2024-01-15T10:30:00Z") → "Jan 15, 2024"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format an ISO date string with time
 * formatDateTime("2024-01-15T10:30:00Z") → "Jan 15, 2024, 10:30 AM"
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return a relative time string
 * timeAgo("2024-01-14T10:00:00Z") → "2 days ago"
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "just now";
}

// ─── ID Generation ────────────────────────────────────────────────────────────

/**
 * Generate a prefixed unique ID
 * generateId("prod") → "prod_k7x2m9q1"
 */
export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPostalCode(code: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(code.trim());
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-().]{7,15}$/.test(phone.trim());
}

// ─── Discount Calculation ─────────────────────────────────────────────────────

/**
 * Apply a discount to a subtotal (in cents)
 * Returns the discount amount in cents (never exceeds subtotal)
 */
export function calcDiscount(
  subtotalCents: number,
  type: "percentage" | "fixed",
  value: number,
): number {
  if (type === "percentage") {
    return Math.min(subtotalCents, Math.round((subtotalCents * value) / 100));
  }
  // fixed is stored in cents
  return Math.min(subtotalCents, value);
}

// ─── Tax Calculation ──────────────────────────────────────────────────────────

/**
 * Calculate tax on a subtotal (after discounts) in cents
 * Default rate 8.875% (NYC) — replace with your region
 */
export function calcTax(
  subtotalCents: number,
  ratePercent = 8.875,
): number {
  return Math.round((subtotalCents * ratePercent) / 100);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function paginate<T>(
  items: T[],
  offset: number,
  limit: number,
): PaginatedResponse<T> {
  const page = items.slice(offset, offset + limit);
  return {
    data: page,
    count: page.length,
    offset,
    limit,
    has_more: offset + limit < items.length,
  };
}

// ─── Error Helpers ────────────────────────────────────────────────────────────

export function makeError(code: string, message: string): ApiError {
  return { code, message };
}

export function isApiError(obj: unknown): obj is ApiError {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "code" in obj &&
    "message" in obj
  );
}

// ─── Object Helpers ───────────────────────────────────────────────────────────

/**
 * Remove undefined/null keys from an object (for DB updates)
 */
export function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<T>;
}

/**
 * Deep clone a plain object (no functions/classes)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Async Helpers ────────────────────────────────────────────────────────────

/**
 * Sleep for ms milliseconds — useful in dev mock delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function up to `attempts` times with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 300,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await sleep(delayMs * Math.pow(2, i));
    }
  }
  throw lastError;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

/**
 * Check if a variant has stock available
 */
export function isInStock(quantity: number): boolean {
  return quantity > 0;
}

/**
 * Get a stock label for display
 * stockLabel(0)   → "Out of stock"
 * stockLabel(3)   → "Only 3 left"
 * stockLabel(100) → "In stock"
 */
export function stockLabel(quantity: number): string {
  if (quantity <= 0) return "Out of stock";
  if (quantity <= 5) return `Only ${quantity} left`;
  return "In stock";
}
// packages/core/types.ts

// ─── Product ──────────────────────────────────────────────────────────────────
export interface ProductVariant {
  id: string;
  title: string;        // e.g. "S / Black"
  sku: string;
  price: number;        // in cents
  inventory_quantity: number;
  options: Record<string, string>; // { size: "S", color: "Black" }
}

export interface Product {
  id: string;
  title: string;
  handle: string;       // URL slug e.g. "obsidian-crew-neck"
  description?: string;
  thumbnail?: string;
  images: string[];
  status: "published" | "draft" | "archived";
  category?: string;
  tags: string[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;           // cart line item id
  product_id: string;
  variant_id: string;
  title: string;
  variant_title: string;
  thumbnail?: string;
  price: number;        // unit price in cents
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  discount_code?: string;
  discount_amount: number;
  shipping_address?: Address;
  billing_address?: Address;
  email?: string;
  payment_session?: PaymentSession;
  created_at: string;
  updated_at: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  variant_title: string;
  thumbnail?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  customer_id?: string;
  email: string;
  items: OrderItem[];
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  discount_amount: number;
  discount_code?: string;
  total: number;
  shipping_address: Address;
  billing_address: Address;
  payment_status: "awaiting" | "captured" | "refunded" | "partially_refunded";
  fulfillment_status: "not_fulfilled" | "fulfilled" | "shipped" | "delivered";
  created_at: string;
  updated_at: string;
}

// ─── Address ─────────────────────────────────────────────────────────────────
export interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  phone?: string;
}

// ─── Customer / Auth ─────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  has_account: boolean;
  created_at: string;
}

export interface AuthSession {
  customer_id: string;
  token: string;
  expires_at: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export interface PaymentSession {
  id: string;
  provider_id: "stripe" | "manual";
  status: "pending" | "authorized" | "captured" | "error" | "cancelled";
  amount: number;
  data: Record<string, unknown>; // provider-specific (e.g. Stripe client_secret)
}

export interface Refund {
  id: string;
  order_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

// ─── Shipping ────────────────────────────────────────────────────────────────
export interface ShippingOption {
  id: string;
  name: string;
  price: number;       // in cents
  estimated_days: number;
  provider: string;
}

// ─── Discount ────────────────────────────────────────────────────────────────
export type DiscountType = "percentage" | "fixed";

export interface Discount {
  id: string;
  code: string;
  type: DiscountType;
  value: number;       // percentage 0-100 or fixed cents
  min_subtotal?: number;
  max_uses?: number;
  uses: number;
  expires_at?: string;
  is_active: boolean;
}

// ─── Inventory ───────────────────────────────────────────────────────────────
export interface InventoryItem {
  variant_id: string;
  location_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

// ─── API Error ───────────────────────────────────────────────────────────────
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
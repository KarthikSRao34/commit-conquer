// packages/modules/cart/cart.service.ts

import {
  type Cart,
  type CartItem,
  type Address,
} from "../../core/types";
import {
  generateId,
  calcDiscount,
  calcTax,
  sleep,
} from "../../core/utils";
import { eventBus, EVENT } from "../../core/event-bus";
import { ProductModel } from "../products/product.model";
import { ServiceError } from "../products/product.service";

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIPPING_FLAT_RATE   = 599;   // $5.99 flat shipping in cents
const FREE_SHIPPING_ABOVE  = 10000; // Free shipping over $100
const TAX_RATE_PERCENT     = 8.875; // %

// ─── Discount Code Registry ───────────────────────────────────────────────────
// Hardcoded for the hackathon — replace with DB lookup later.

const DISCOUNT_CODES: Record<string, { type: "percentage" | "fixed"; value: number }> = {
  LAUNCH10:  { type: "percentage", value: 10 },
  LAUNCH20:  { type: "percentage", value: 20 },
  FLAT500:   { type: "fixed",      value: 500  },   // $5 off
  FLAT1000:  { type: "fixed",      value: 1000 },   // $10 off
};

// ─── In-Memory Cart Store ─────────────────────────────────────────────────────

const carts = new Map<string, Cart>();

// ─── Cart Service ─────────────────────────────────────────────────────────────

export const CartService = {

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(email?: string): Promise<Cart> {
    const cart: Cart = {
      id:               generateId("cart"),
      items:            [],
      subtotal:         0,
      shipping_total:   SHIPPING_FLAT_RATE,
      tax_total:        0,
      total:            0,
      discount_amount:  0,
      email:            email,
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    };

    carts.set(cart.id, cart);

    await eventBus.emit(EVENT.CART_CREATED, { cart_id: cart.id });

    return cart;
  },

  // ─── Get ───────────────────────────────────────────────────────────────────

  get(cartId: string): Cart {
    const cart = carts.get(cartId);
    if (!cart) throw new ServiceError("CART_NOT_FOUND", `Cart ${cartId} not found`);
    return cart;
  },

  // ─── Add Item ──────────────────────────────────────────────────────────────
  // Validates stock before adding. If the variant is already in cart,
  // increments quantity instead of duplicating.

  async addItem(
    cartId: string,
    productId: string,
    variantId: string,
    quantity = 1,
  ): Promise<Cart> {
    const cart = CartService.get(cartId);

    // ── Validate product + variant exist ──
    const product = ProductModel.findById(productId);
    if (!product) {
      throw new ServiceError("PRODUCT_NOT_FOUND", `Product ${productId} not found`);
    }

    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new ServiceError("VARIANT_NOT_FOUND", `Variant ${variantId} not found`);
    }

    // ── Stock check ──
    const existingLine = cart.items.find((i) => i.variant_id === variantId);
    const currentQtyInCart = existingLine?.quantity ?? 0;
    const requested = currentQtyInCart + quantity;

    if (variant.inventory_quantity < requested) {
      throw new ServiceError(
        "INSUFFICIENT_STOCK",
        `Only ${variant.inventory_quantity} units available for "${variant.title}"`,
      );
    }

    // ── Add or increment ──
    if (existingLine) {
      existingLine.quantity += quantity;
    } else {
      const line: CartItem = {
        id:            generateId("cli"),
        product_id:    productId,
        variant_id:    variantId,
        title:         product.title,
        variant_title: variant.title,
        thumbnail:     product.thumbnail,
        price:         variant.price,
        quantity,
      };
      cart.items.push(line);
    }

    const updated = _recalc(cart);
    carts.set(cartId, updated);

    await eventBus.emit(EVENT.CART_UPDATED, { cart_id: cartId });

    return updated;
  },

  // ─── Remove Item ───────────────────────────────────────────────────────────

  async removeItem(cartId: string, lineItemId: string): Promise<Cart> {
    const cart = CartService.get(cartId);

    const before = cart.items.length;
    cart.items = cart.items.filter((i) => i.id !== lineItemId);

    if (cart.items.length === before) {
      throw new ServiceError("ITEM_NOT_FOUND", `Line item ${lineItemId} not in cart`);
    }

    const updated = _recalc(cart);
    carts.set(cartId, updated);

    await eventBus.emit(EVENT.CART_UPDATED, { cart_id: cartId });

    return updated;
  },

  // ─── Update Quantity ───────────────────────────────────────────────────────
  // Setting quantity to 0 removes the line item.

  async updateQuantity(
    cartId: string,
    lineItemId: string,
    quantity: number,
  ): Promise<Cart> {
    if (quantity < 0) {
      throw new ServiceError("INVALID_QUANTITY", "Quantity cannot be negative");
    }

    const cart = CartService.get(cartId);

    if (quantity === 0) {
      return CartService.removeItem(cartId, lineItemId);
    }

    const line = cart.items.find((i) => i.id === lineItemId);
    if (!line) {
      throw new ServiceError("ITEM_NOT_FOUND", `Line item ${lineItemId} not in cart`);
    }

    // Stock check
    const variant = ProductModel.findVariant(line.product_id, line.variant_id);
    if (variant && variant.inventory_quantity < quantity) {
      throw new ServiceError(
        "INSUFFICIENT_STOCK",
        `Only ${variant.inventory_quantity} units available`,
      );
    }

    line.quantity = quantity;

    const updated = _recalc(cart);
    carts.set(cartId, updated);

    await eventBus.emit(EVENT.CART_UPDATED, { cart_id: cartId });

    return updated;
  },

  // ─── Apply Discount Code ───────────────────────────────────────────────────

  async applyDiscount(cartId: string, code: string): Promise<Cart> {
    const cart = CartService.get(cartId);

    const discount = DISCOUNT_CODES[code.toUpperCase()];
    if (!discount) {
      throw new ServiceError("INVALID_DISCOUNT", `Discount code "${code}" is not valid`);
    }

    if (cart.items.length === 0) {
      throw new ServiceError("EMPTY_CART", "Add items before applying a discount");
    }

    cart.discount_code = code.toUpperCase();

    const updated = _recalc(cart);
    carts.set(cartId, updated);

    await eventBus.emit(EVENT.CART_UPDATED, { cart_id: cartId });

    return updated;
  },

  // ─── Remove Discount ───────────────────────────────────────────────────────

  async removeDiscount(cartId: string): Promise<Cart> {
    const cart = CartService.get(cartId);
    delete cart.discount_code;
    const updated = _recalc(cart);
    carts.set(cartId, updated);
    return updated;
  },

  // ─── Set Email ─────────────────────────────────────────────────────────────

  async setEmail(cartId: string, email: string): Promise<Cart> {
    const cart = CartService.get(cartId);
    cart.email = email;
    cart.updated_at = new Date().toISOString();
    carts.set(cartId, cart);
    return cart;
  },

  // ─── Set Shipping Address ──────────────────────────────────────────────────

  async setShippingAddress(cartId: string, address: Address): Promise<Cart> {
    const cart = CartService.get(cartId);
    cart.shipping_address = address;
    cart.updated_at = new Date().toISOString();
    const updated = _recalc(cart);
    carts.set(cartId, updated);
    return updated;
  },

  // ─── Set Billing Address ───────────────────────────────────────────────────

  async setBillingAddress(cartId: string, address: Address): Promise<Cart> {
    const cart = CartService.get(cartId);
    cart.billing_address = address;
    cart.updated_at = new Date().toISOString();
    carts.set(cartId, cart);
    return cart;
  },

  // ─── Complete Cart → Order ─────────────────────────────────────────────────
  // Called by OrderService after payment is confirmed.
  // Marks the cart as completed and removes it from active carts.

  async complete(cartId: string): Promise<{ cart: Cart; order_id: string }> {
    const cart = CartService.get(cartId);

    // ── Guard: cart must have email + address + items ──
    if (!cart.email) {
      throw new ServiceError("MISSING_EMAIL", "Cart must have an email before completing");
    }
    if (!cart.shipping_address) {
      throw new ServiceError("MISSING_ADDRESS", "Cart must have a shipping address");
    }
    if (cart.items.length === 0) {
      throw new ServiceError("EMPTY_CART", "Cannot complete an empty cart");
    }

    // Simulate network delay for hackathon demo
    await sleep(200);

    const orderId = generateId("ord");

    await eventBus.emit(EVENT.CART_COMPLETED, {
      cart_id:  cartId,
      order_id: orderId,
    });

    // Remove from active carts
    carts.delete(cartId);

    return { cart, order_id: orderId };
  },

  // ─── Clear ─────────────────────────────────────────────────────────────────

  async clear(cartId: string): Promise<Cart> {
    const cart = CartService.get(cartId);
    cart.items           = [];
    cart.discount_code   = undefined;
    const updated        = _recalc(cart);
    carts.set(cartId, updated);
    return updated;
  },

  // ─── Summary (for checkout display) ───────────────────────────────────────

  summary(cartId: string): {
    item_count: number;
    subtotal: number;
    discount_amount: number;
    shipping_total: number;
    tax_total: number;
    total: number;
  } {
    const cart = CartService.get(cartId);
    return {
      item_count:      cart.items.reduce((s, i) => s + i.quantity, 0),
      subtotal:        cart.subtotal,
      discount_amount: cart.discount_amount,
      shipping_total:  cart.shipping_total,
      tax_total:       cart.tax_total,
      total:           cart.total,
    };
  },
};

// ─── Private: Recalculate Totals ──────────────────────────────────────────────
// Called after every mutation. Order of operations:
//   1. subtotal  = sum of (price × qty) for all items
//   2. discount  = apply code if present
//   3. shipping  = flat rate, waived above FREE_SHIPPING_ABOVE
//   4. tax       = applied on (subtotal - discount)
//   5. total     = subtotal - discount + shipping + tax

function _recalc(cart: Cart): Cart {
  // 1. Subtotal
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // 2. Discount
  let discountAmount = 0;
  if (cart.discount_code) {
    const rule = DISCOUNT_CODES[cart.discount_code];
    if (rule) {
      discountAmount = calcDiscount(subtotal, rule.type, rule.value);
    }
  }

  // 3. Shipping — free above threshold
  const shippingTotal =
    subtotal - discountAmount >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FLAT_RATE;

  // 4. Tax on discounted subtotal
  const taxBase  = Math.max(0, subtotal - discountAmount);
  const taxTotal = calcTax(taxBase, TAX_RATE_PERCENT);

  // 5. Grand total
  const total = taxBase + shippingTotal + taxTotal;

  return {
    ...cart,
    subtotal,
    discount_amount: discountAmount,
    shipping_total:  shippingTotal,
    tax_total:       taxTotal,
    total,
    updated_at:      new Date().toISOString(),
  };
}
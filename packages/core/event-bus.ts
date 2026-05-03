// packages/core/event-bus.ts

// ─── Types ────────────────────────────────────────────────────────────────────

type Handler<T = unknown> = (payload: T) => void | Promise<void>;

interface Subscription {
  event: string;
  handler: Handler<any>;
}

// ─── Event Catalogue ─────────────────────────────────────────────────────────
// Centralised list of every event in the system.
// Import EVENT from here instead of using raw strings — catches typos at compile time.

export const EVENT = {
  // Product events
  PRODUCT_CREATED:        "product.created",
  PRODUCT_UPDATED:        "product.updated",
  PRODUCT_DELETED:        "product.deleted",
  PRODUCT_PUBLISHED:      "product.published",

  // Cart events
  CART_CREATED:           "cart.created",
  CART_UPDATED:           "cart.updated",
  CART_ABANDONED:         "cart.abandoned",
  CART_COMPLETED:         "cart.completed",

  // Order events
  ORDER_PLACED:           "order.placed",
  ORDER_UPDATED:          "order.updated",
  ORDER_CANCELLED:        "order.cancelled",
  ORDER_FULFILLED:        "order.fulfilled",
  ORDER_SHIPPED:          "order.shipped",
  ORDER_DELIVERED:        "order.delivered",
  ORDER_REFUND_REQUESTED: "order.refund_requested",
  ORDER_REFUNDED:         "order.refunded",

  // Payment events
  PAYMENT_INITIATED:      "payment.initiated",
  PAYMENT_CAPTURED:       "payment.captured",
  PAYMENT_FAILED:         "payment.failed",
  PAYMENT_REFUNDED:       "payment.refunded",

  // Inventory events
  INVENTORY_UPDATED:      "inventory.updated",
  INVENTORY_LOW:          "inventory.low",
  INVENTORY_OUT:          "inventory.out",

  // Customer / Auth events
  CUSTOMER_CREATED:       "customer.created",
  CUSTOMER_LOGGED_IN:     "customer.logged_in",
  CUSTOMER_LOGGED_OUT:    "customer.logged_out",
  PASSWORD_RESET:         "customer.password_reset",

  // Shipping events
  SHIPMENT_CREATED:       "shipment.created",
  SHIPMENT_UPDATED:       "shipment.updated",
} as const;

export type EventName = (typeof EVENT)[keyof typeof EVENT];

// ─── Typed Payloads ───────────────────────────────────────────────────────────
// Add the payload shape for each event here.
// The emit() call will be type-checked against these.

export interface EventPayloadMap {
  [EVENT.PRODUCT_CREATED]:        { product_id: string; title: string };
  [EVENT.PRODUCT_UPDATED]:        { product_id: string; changes: Record<string, unknown> };
  [EVENT.PRODUCT_DELETED]:        { product_id: string };
  [EVENT.PRODUCT_PUBLISHED]:      { product_id: string };

  [EVENT.CART_CREATED]:           { cart_id: string };
  [EVENT.CART_UPDATED]:           { cart_id: string };
  [EVENT.CART_ABANDONED]:         { cart_id: string; email?: string };
  [EVENT.CART_COMPLETED]:         { cart_id: string; order_id: string };

  [EVENT.ORDER_PLACED]:           { order_id: string; customer_email: string; total: number };
  [EVENT.ORDER_UPDATED]:          { order_id: string; changes: Record<string, unknown> };
  [EVENT.ORDER_CANCELLED]:        { order_id: string; reason?: string };
  [EVENT.ORDER_FULFILLED]:        { order_id: string };
  [EVENT.ORDER_SHIPPED]:          { order_id: string; tracking_number?: string };
  [EVENT.ORDER_DELIVERED]:        { order_id: string };
  [EVENT.ORDER_REFUND_REQUESTED]: { order_id: string; amount: number };
  [EVENT.ORDER_REFUNDED]:         { order_id: string; amount: number };

  [EVENT.PAYMENT_INITIATED]:      { order_id: string; provider: string; amount: number };
  [EVENT.PAYMENT_CAPTURED]:       { order_id: string; amount: number };
  [EVENT.PAYMENT_FAILED]:         { order_id: string; error: string };
  [EVENT.PAYMENT_REFUNDED]:       { order_id: string; amount: number };

  [EVENT.INVENTORY_UPDATED]:      { variant_id: string; quantity: number };
  [EVENT.INVENTORY_LOW]:          { variant_id: string; quantity: number; threshold: number };
  [EVENT.INVENTORY_OUT]:          { variant_id: string };

  [EVENT.CUSTOMER_CREATED]:       { customer_id: string; email: string };
  [EVENT.CUSTOMER_LOGGED_IN]:     { customer_id: string };
  [EVENT.CUSTOMER_LOGGED_OUT]:    { customer_id: string };
  [EVENT.PASSWORD_RESET]:         { customer_id: string; email: string };

  [EVENT.SHIPMENT_CREATED]:       { order_id: string; tracking_number: string; carrier: string };
  [EVENT.SHIPMENT_UPDATED]:       { order_id: string; status: string };
}

// ─── EventBus ─────────────────────────────────────────────────────────────────

class EventBus {
  private listeners = new Map<string, Set<Handler<any>>>();
  private history: Array<{ event: string; payload: unknown; at: string }> = [];
  private maxHistory = 100;

  // ─── Subscribe ──────────────────────────────────────────────────────────────
  // Returns an unsubscribe function — call it to clean up listeners.
  //
  // Usage:
  //   const off = eventBus.on(EVENT.ORDER_PLACED, async ({ order_id }) => {
  //     await sendConfirmationEmail(order_id);
  //   });
  //   // later…
  //   off(); // removes this listener

  on<E extends EventName>(
    event: E,
    handler: Handler<EventPayloadMap[E]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  // ─── Subscribe once ─────────────────────────────────────────────────────────
  // Auto-removes itself after the first call.

  once<E extends EventName>(
    event: E,
    handler: Handler<EventPayloadMap[E]>,
  ): () => void {
    const wrapper: Handler<EventPayloadMap[E]> = (payload) => {
      handler(payload);
      this.listeners.get(event)?.delete(wrapper);
    };
    return this.on(event, wrapper);
  }

  // ─── Emit ───────────────────────────────────────────────────────────────────
  // Fires all handlers for the event.
  // Errors in individual handlers are caught and logged — one bad handler
  // won't block the rest.

  async emit<E extends EventName>(
    event: E,
    payload: EventPayloadMap[E],
  ): Promise<void> {
    // Record in history (capped at maxHistory)
    this.history.push({ event, payload, at: new Date().toISOString() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    const promises = [...handlers].map(async (handler) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(
          `[EventBus] Handler error on "${event}":`,
          err instanceof Error ? err.message : err,
        );
      }
    });

    await Promise.all(promises);
  }

  // ─── Emit sync ──────────────────────────────────────────────────────────────
  // Fire-and-forget — does not await handlers.
  // Use when you don't need to wait for side-effects to complete.

  emitSync<E extends EventName>(
    event: E,
    payload: EventPayloadMap[E],
  ): void {
    this.emit(event, payload).catch((err) =>
      console.error("[EventBus] emitSync unhandled:", err),
    );
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  /** Remove all handlers for a specific event */
  off(event: EventName): void {
    this.listeners.delete(event);
  }

  /** Remove every listener on every event */
  clear(): void {
    this.listeners.clear();
  }

  /** How many handlers are registered for an event */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /** Recent event history — useful for debugging */
  getHistory(): ReadonlyArray<{ event: string; payload: unknown; at: string }> {
    return this.history;
  }

  /** All currently registered event names */
  registeredEvents(): string[] {
    return [...this.listeners.keys()];
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
// Import this single instance everywhere — one bus for the whole app.
//
// Usage in any module:
//   import { eventBus, EVENT } from "@/packages/core/event-bus";
//
//   // Listen
//   eventBus.on(EVENT.ORDER_PLACED, async ({ order_id, total }) => {
//     console.log(`New order ${order_id} for $${total / 100}`);
//   });
//
//   // Emit
//   await eventBus.emit(EVENT.ORDER_PLACED, {
//     order_id: "ord_abc123",
//     customer_email: "user@example.com",
//     total: 4999,
//   });

export const eventBus = new EventBus();

// ─── Convenience re-export ────────────────────────────────────────────────────
// So callers only need one import line:
// import { eventBus, EVENT, type EventName } from "@/packages/core/event-bus";
export type { Handler, Subscription };
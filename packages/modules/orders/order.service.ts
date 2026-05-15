

import {
  type Order,
  type OrderStatus,
  type OrderItem,
  type PaginatedResponse,
} from "../../core/types";
import { generateId, paginate, formatMoney, sleep } from "../../core/utils";
import { eventBus, EVENT } from "../../core/event-bus";
import { ServiceError } from "../products/product.service";
import { ProductService } from "../products/product.service";
import { CartService } from "../cart/cart.service";


export interface ListOrdersInput {
  offset?: number;
  limit?: number;
  status?: OrderStatus | "all";
  search?: string;
  sort?: "newest" | "oldest" | "total_asc" | "total_desc";
  customer_id?: string;
}

export interface PlaceOrderInput {
  cart_id: string;
  payment_provider?: "stripe" | "manual";
}

export interface RefundInput {
  order_id: string;
  amount: number;        
  reason?: string;
}



const orders = new Map<string, Order>();



function _seedOrders() {
  const NAMES = [
    { first: "Ethan",  last: "Cole",   email: "ethan@example.com"  },
    { first: "Maya",   last: "Patel",  email: "maya@example.com"   },
    { first: "Lucas",  last: "Kim",    email: "lucas@example.com"  },
    { first: "Zoe",    last: "Turner", email: "zoe@example.com"    },
    { first: "Aiden",  last: "Brooks", email: "aiden@example.com"  },
    { first: "Sara",   last: "Nolan",  email: "sara@example.com"   },
  ];

  const ITEM_SETS: Array<Array<{ title: string; variant_title: string; price: number; qty: number }>> = [
    [{ title: "Obsidian Crew Neck", variant_title: "M / Black",  price: 7900,  qty: 1 }],
    [{ title: "Slate Cargo Pant",   variant_title: "32x30 / Slate", price: 11900, qty: 1 },
     { title: "Onyx Hoodie",        variant_title: "L / Onyx",   price: 9400,  qty: 1 }],
    [{ title: "Granite Bomber",     variant_title: "M / Granite", price: 16800, qty: 1 }],
    [{ title: "Carbon Jogger",      variant_title: "M / Carbon",  price: 8900,  qty: 2 }],
    [{ title: "Ash Trench Coat",    variant_title: "S / Ash",     price: 22900, qty: 1 }],
    [{ title: "Basalt Windbreaker", variant_title: "L / Basalt",  price: 13400, qty: 1 },
     { title: "Flint Overshirt",    variant_title: "M / Flint",   price: 11400, qty: 1 }],
  ];

  const STATUSES: OrderStatus[] = [
    "pending", "processing", "shipped", "delivered", "cancelled", "refunded",
  ];

  const ADDRESSES = [
    { city: "San Francisco", state: "CA", postal_code: "94105" },
    { city: "New York",      state: "NY", postal_code: "10001" },
    { city: "Austin",        state: "TX", postal_code: "73301" },
  ];

  Array.from({ length: 24 }, (_, i) => {
    const person  = NAMES[i % NAMES.length];
    const rawItems = ITEM_SETS[i % ITEM_SETS.length];
    const addr    = ADDRESSES[i % ADDRESSES.length];
    const status  = STATUSES[i % STATUSES.length];

    const items: OrderItem[] = rawItems.map((it, j) => ({
      id:            `item_seed_${i}_${j}`,
      product_id:    `prod_00${(j + 1)}`,
      variant_id:    `var_seed_${i}_${j}`,
      title:         it.title,
      variant_title: it.variant_title,
      price:         it.price,
      quantity:      it.qty,
      subtotal:      it.price * it.qty,
    }));

    const subtotal       = items.reduce((s, it) => s + it.subtotal, 0);
    const shipping_total = subtotal >= 10000 ? 0 : 599;
    const tax_total      = Math.round(subtotal * 0.08875);
    const total          = subtotal + shipping_total + tax_total;

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - i * 2);

    const order: Order = {
      id:                  `ORD-${String(1000 + i).padStart(4, "0")}`,
      status,
      email:               person.email,
      items,
      subtotal,
      shipping_total,
      tax_total,
      discount_amount:     0,
      total,
      shipping_address: {
        first_name:   person.first,
        last_name:    person.last,
        address_1:    `${100 + i * 7} Maple Ave`,
        city:         addr.city,
        state:        addr.state,
        postal_code:  addr.postal_code,
        country_code: "US",
      },
      billing_address: {
        first_name:   person.first,
        last_name:    person.last,
        address_1:    `${100 + i * 7} Maple Ave`,
        city:         addr.city,
        state:        addr.state,
        postal_code:  addr.postal_code,
        country_code: "US",
      },
      payment_status:      status === "refunded" ? "refunded" : "captured",
      fulfillment_status:
        status === "delivered" ? "delivered"
        : status === "shipped" ? "shipped"
        : status === "cancelled" ? "not_fulfilled"
        : "not_fulfilled",
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    };

    orders.set(order.id, order);
  });
}

_seedOrders();



export const OrderService = {

  

  list(input: ListOrdersInput = {}): PaginatedResponse<Order> {
    const {
      offset = 0,
      limit  = 20,
      status = "all",
      search,
      sort   = "newest",
      customer_id,
    } = input;

    let result = [...orders.values()];

    
    if (status !== "all") {
      result = result.filter((o) => o.status === status);
    }

    
    if (customer_id) {
      result = result.filter((o) => o.customer_id === customer_id);
    }

    
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          `${o.shipping_address.first_name} ${o.shipping_address.last_name}`
            .toLowerCase()
            .includes(q),
      );
    }

    
    result = result.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "total_asc":
          return a.total - b.total;
        case "total_desc":
          return b.total - a.total;
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return paginate(result, offset, limit);
  },

  

  getById(id: string): Order {
    const order = orders.get(id);
    if (!order) throw new ServiceError("ORDER_NOT_FOUND", `Order ${id} not found`);
    return order;
  },


  async place(input: PlaceOrderInput): Promise<Order> {
    
    const { cart, order_id } = await CartService.complete(input.cart_id);

    
    const items: OrderItem[] = cart.items.map((ci) => ({
      id:            generateId("oi"),
      product_id:    ci.product_id,
      variant_id:    ci.variant_id,
      title:         ci.title,
      variant_title: ci.variant_title,
      thumbnail:     ci.thumbnail,
      price:         ci.price,
      quantity:      ci.quantity,
      subtotal:      ci.price * ci.quantity,
    }));

    
    const order: Order = {
      id:                  order_id,
      status:              "pending",
      email:               cart.email!,
      items,
      subtotal:            cart.subtotal,
      shipping_total:      cart.shipping_total,
      tax_total:           cart.tax_total,
      discount_amount:     cart.discount_amount,
      total:               cart.total,
      shipping_address:    cart.shipping_address!,
      billing_address:     cart.billing_address ?? cart.shipping_address!,
      payment_status:      "awaiting",
      fulfillment_status:  "not_fulfilled",
      created_at:          new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    };

    orders.set(order.id, order);

    
    for (const item of cart.items) {
      try {
        await ProductService.adjustInventory(
          item.product_id,
          item.variant_id,
          -item.quantity,
        );
      } catch (err) {
        console.warn(
          `[OrderService] inventory adjustment failed for variant ${item.variant_id}:`,
          err,
        );
      }
    }

    
    await eventBus.emit(EVENT.ORDER_PLACED, {
      order_id:       order.id,
      customer_email: order.email,
      total:          order.total,
    });

    return order;
  },

  

  async fulfill(orderId: string): Promise<Order> {
    const order = OrderService.getById(orderId);

    if (!["pending", "processing"].includes(order.status)) {
      throw new ServiceError(
        "INVALID_TRANSITION",
        `Cannot fulfill an order with status "${order.status}"`,
      );
    }

    await sleep(300); 

    const updated = _update(orderId, {
      status:             "processing",
      fulfillment_status: "fulfilled",
      payment_status:     "captured",
    });

    await eventBus.emit(EVENT.ORDER_FULFILLED, { order_id: orderId });

    return updated;
  },

  

  async ship(orderId: string, tracking_number?: string): Promise<Order> {
    const order = OrderService.getById(orderId);

    if (order.fulfillment_status !== "fulfilled") {
      throw new ServiceError(
        "INVALID_TRANSITION",
        `Order must be fulfilled before it can be shipped`,
      );
    }

    await sleep(200);

    const updated = _update(orderId, {
      status:             "shipped",
      fulfillment_status: "shipped",
    });

    await eventBus.emit(EVENT.ORDER_SHIPPED, { order_id: orderId, tracking_number });

    return updated;
  },

  

  async deliver(orderId: string): Promise<Order> {
    const order = OrderService.getById(orderId);

    if (order.status !== "shipped") {
      throw new ServiceError(
        "INVALID_TRANSITION",
        `Order must be shipped before marking as delivered`,
      );
    }

    const updated = _update(orderId, {
      status:             "delivered",
      fulfillment_status: "delivered",
    });

    await eventBus.emit(EVENT.ORDER_DELIVERED, { order_id: orderId });

    return updated;
  },

  

  async cancel(orderId: string, reason?: string): Promise<Order> {
    const order = OrderService.getById(orderId);

    if (!["pending", "processing"].includes(order.status)) {
      throw new ServiceError(
        "INVALID_TRANSITION",
        `Cannot cancel an order with status "${order.status}"`,
      );
    }

    await sleep(300);

    // Re-stock inventory
    for (const item of order.items) {
      try {
        await ProductService.adjustInventory(
          item.product_id,
          item.variant_id,
          +item.quantity,  // positive = restock
        );
      } catch (err) {
        console.warn(`[OrderService] restock failed for variant ${item.variant_id}:`, err);
      }
    }

    const updated = _update(orderId, {
      status:            "cancelled",
      fulfillment_status: "not_fulfilled",
    });

    await eventBus.emit(EVENT.ORDER_CANCELLED, { order_id: orderId, reason });

    return updated;
  },

  

  async refund(input: RefundInput): Promise<Order> {
    const { order_id, amount, reason = "customer_request" } = input;
    const order = OrderService.getById(order_id);

    if (!["delivered", "shipped"].includes(order.status)) {
      throw new ServiceError(
        "INVALID_TRANSITION",
        `Refunds are only allowed on shipped or delivered orders`,
      );
    }

    if (amount <= 0) {
      throw new ServiceError("INVALID_AMOUNT", "Refund amount must be greater than zero");
    }

    if (amount > order.total) {
      throw new ServiceError(
        "INVALID_AMOUNT",
        `Refund amount ${formatMoney(amount)} exceeds order total ${formatMoney(order.total)}`,
      );
    }

    await sleep(400);

    await eventBus.emit(EVENT.ORDER_REFUND_REQUESTED, { order_id, amount });

    const isFullRefund = amount === order.total;

    const updated = _update(order_id, {
      status:         isFullRefund ? "refunded" : order.status,
      payment_status: isFullRefund ? "refunded" : "partially_refunded",
    });

    await eventBus.emit(EVENT.ORDER_REFUNDED, { order_id, amount });

    return updated;
  },

  

  stats(): {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
    revenue: number;
  } {
    const all = [...orders.values()];
    const revenue = all
      .filter((o) => !["cancelled", "refunded"].includes(o.status))
      .reduce((sum, o) => sum + o.total, 0);

    return {
      total:      all.length,
      pending:    all.filter((o) => o.status === "pending").length,
      processing: all.filter((o) => o.status === "processing").length,
      shipped:    all.filter((o) => o.status === "shipped").length,
      delivered:  all.filter((o) => o.status === "delivered").length,
      cancelled:  all.filter((o) => o.status === "cancelled").length,
      refunded:   all.filter((o) => o.status === "refunded").length,
      revenue,
    };
  },
};



function _update(id: string, changes: Partial<Order>): Order {
  const order = orders.get(id);
  if (!order) throw new ServiceError("ORDER_NOT_FOUND", `Order ${id} not found`);

  const updated: Order = {
    ...order,
    ...changes,
    id,
    updated_at: new Date().toISOString(),
  };

  orders.set(id, updated);
  return updated;
}
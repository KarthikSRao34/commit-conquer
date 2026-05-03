// packages/modules/payments/payment.service.ts

import { type PaymentSession, type Refund } from "../../core/types";
import { generateId, formatMoney, sleep } from "../../core/utils";
import { eventBus, EVENT } from "../../core/event-bus";
import { ServiceError } from "../products/product.service";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentProvider = "stripe" | "manual";

export interface InitiatePaymentInput {
  order_id: string;
  amount: number;           // cents
  currency?: string;        // default "usd"
  provider?: PaymentProvider;
  customer_email?: string;
}

export interface CapturePaymentInput {
  session_id: string;
  order_id: string;
}

export interface RefundPaymentInput {
  session_id: string;
  order_id: string;
  amount: number;           // cents — partial or full
  reason?: string;
}

// ─── In-Memory Stores ─────────────────────────────────────────────────────────

const sessions = new Map<string, PaymentSession>();
const refunds  = new Map<string, Refund>();

// Index: order_id → session_id (one active session per order)
const orderSessionIndex = new Map<string, string>();

// ─── Payment Service ──────────────────────────────────────────────────────────

export const PaymentService = {

  // ─── Initiate ──────────────────────────────────────────────────────────────
  // Creates a payment session for an order.
  // For Stripe: returns a client_secret the frontend uses with Stripe.js.
  // For manual: immediately marks as authorized.

  async initiate(input: InitiatePaymentInput): Promise<PaymentSession> {
    const {
      order_id,
      amount,
      currency    = "usd",
      provider    = "stripe",
      customer_email,
    } = input;

    if (amount <= 0) {
      throw new ServiceError("INVALID_AMOUNT", "Payment amount must be greater than zero");
    }

    // Cancel any existing session for this order before creating a new one
    const existingSessionId = orderSessionIndex.get(order_id);
    if (existingSessionId) {
      const existing = sessions.get(existingSessionId);
      if (existing && existing.status === "pending") {
        existing.status = "cancelled";
        sessions.set(existingSessionId, existing);
      }
    }

    await sleep(200); // simulate provider API call

    const session: PaymentSession = {
      id:          generateId("ps"),
      provider_id: provider,
      status:      "pending",
      amount,
      data:        {},
    };

    // ── Provider-specific setup ──
    if (provider === "stripe") {
      // In production: call Stripe API to create a PaymentIntent
      // const intent = await stripe.paymentIntents.create({ amount, currency, receipt_email: customer_email });
      // session.data = { client_secret: intent.client_secret, payment_intent_id: intent.id };

      // Hackathon mock — fake client_secret
      session.data = {
        client_secret:      `pi_mock_${session.id}_secret_${Math.random().toString(36).slice(2)}`,
        payment_intent_id:  `pi_mock_${session.id}`,
        currency,
        customer_email,
      };
    }

    if (provider === "manual") {
      // Manual payments are pre-authorized immediately
      session.status = "authorized";
      session.data   = { note: "Manual payment — no gateway" };
    }

    sessions.set(session.id, session);
    orderSessionIndex.set(order_id, session.id);

    await eventBus.emit(EVENT.PAYMENT_INITIATED, {
      order_id,
      provider,
      amount,
    });

    return session;
  },

  // ─── Get Session ───────────────────────────────────────────────────────────

  getSession(sessionId: string): PaymentSession {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new ServiceError("SESSION_NOT_FOUND", `Payment session ${sessionId} not found`);
    }
    return session;
  },

  getSessionByOrderId(orderId: string): PaymentSession | undefined {
    const sessionId = orderSessionIndex.get(orderId);
    if (!sessionId) return undefined;
    return sessions.get(sessionId);
  },

  // ─── Authorize ─────────────────────────────────────────────────────────────
  // Called by the frontend after Stripe.js confirms payment.
  // In production: Stripe sends a webhook → you call this.

  async authorize(sessionId: string): Promise<PaymentSession> {
    const session = PaymentService.getSession(sessionId);

    if (session.status !== "pending") {
      throw new ServiceError(
        "INVALID_STATUS",
        `Cannot authorize a session with status "${session.status}"`,
      );
    }

    await sleep(150);

    session.status = "authorized";
    sessions.set(sessionId, session);

    return session;
  },

  // ─── Capture ───────────────────────────────────────────────────────────────
  // Captures an authorized payment.
  // For Stripe: call stripe.paymentIntents.capture(payment_intent_id).

  async capture(input: CapturePaymentInput): Promise<PaymentSession> {
    const { session_id, order_id } = input;
    const session = PaymentService.getSession(session_id);

    if (!["authorized", "pending"].includes(session.status)) {
      throw new ServiceError(
        "INVALID_STATUS",
        `Cannot capture a payment with status "${session.status}"`,
      );
    }

    await sleep(300); // simulate gateway call

    // Stripe capture (production):
    // if (session.provider_id === "stripe") {
    //   await stripe.paymentIntents.capture(session.data.payment_intent_id as string);
    // }

    session.status = "captured";
    sessions.set(session_id, session);

    await eventBus.emit(EVENT.PAYMENT_CAPTURED, {
      order_id,
      amount: session.amount,
    });

    return session;
  },

  // ─── Refund ────────────────────────────────────────────────────────────────
  // Issues a partial or full refund against a captured session.
  // Validates that cumulative refunds do not exceed the original charge.

  async refund(input: RefundPaymentInput): Promise<Refund> {
    const { session_id, order_id, amount, reason = "customer_request" } = input;

    const session = PaymentService.getSession(session_id);

    if (session.status !== "captured") {
      throw new ServiceError(
        "INVALID_STATUS",
        `Can only refund a captured payment (current status: "${session.status}")`,
      );
    }

    if (amount <= 0) {
      throw new ServiceError("INVALID_AMOUNT", "Refund amount must be greater than zero");
    }

    // ── Guard: total refunded so far + this amount must not exceed original charge ──
    const alreadyRefunded = _totalRefunded(session_id);
    const remaining       = session.amount - alreadyRefunded;

    if (amount > remaining) {
      throw new ServiceError(
        "REFUND_EXCEEDS_CHARGE",
        `Refund of ${formatMoney(amount)} exceeds remaining refundable amount of ${formatMoney(remaining)}`,
      );
    }

    await sleep(400); // simulate gateway

    // Stripe refund (production):
    // if (session.provider_id === "stripe") {
    //   await stripe.refunds.create({
    //     payment_intent: session.data.payment_intent_id as string,
    //     amount,
    //   });
    // }

    const refund: Refund = {
      id:         generateId("ref"),
      order_id,
      amount,
      reason,
      created_at: new Date().toISOString(),
    };

    refunds.set(refund.id, refund);

    // If fully refunded update session status
    const newTotal = alreadyRefunded + amount;
    if (newTotal >= session.amount) {
      session.status = "captured"; // keep captured — track refund state at order level
    }
    sessions.set(session_id, session);

    await eventBus.emit(EVENT.PAYMENT_REFUNDED, { order_id, amount });

    return refund;
  },

  // ─── Cancel Session ────────────────────────────────────────────────────────
  // Called when an order is cancelled before capture.

  async cancelSession(sessionId: string, orderId: string): Promise<PaymentSession> {
    const session = PaymentService.getSession(sessionId);

    if (session.status === "captured") {
      throw new ServiceError(
        "ALREADY_CAPTURED",
        "Cannot cancel a captured payment — issue a refund instead",
      );
    }

    await sleep(150);

    // Stripe cancel (production):
    // if (session.provider_id === "stripe" && session.status !== "cancelled") {
    //   await stripe.paymentIntents.cancel(session.data.payment_intent_id as string);
    // }

    session.status = "cancelled";
    sessions.set(sessionId, session);

    await eventBus.emit(EVENT.PAYMENT_FAILED, {
      order_id: orderId,
      error:    "Payment session cancelled",
    });

    return session;
  },

  // ─── Webhook Handler ───────────────────────────────────────────────────────
  // Processes incoming Stripe webhooks in production.
  // Mount this at POST /webhooks/stripe in your API server.

  async handleStripeWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{ received: boolean }> {
    // Production:
    // const event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    // switch (event.type) {
    //   case "payment_intent.succeeded": ...
    //   case "payment_intent.payment_failed": ...
    //   case "charge.refunded": ...
    // }

    // Hackathon: log and acknowledge
    console.log("[PaymentService] Stripe webhook received (mock):", signature.slice(0, 20));
    return { received: true };
  },

  // ─── Refund history for a session ──────────────────────────────────────────

  getRefunds(sessionId: string): Refund[] {
    return [...refunds.values()].filter(
      (r) => {
        // Link refunds back via order → session
        const sid = orderSessionIndex.get(r.order_id);
        return sid === sessionId;
      },
    );
  },

  // ─── Summary ───────────────────────────────────────────────────────────────

  summary(sessionId: string): {
    charged: number;
    refunded: number;
    remaining: number;
    status: string;
  } {
    const session     = PaymentService.getSession(sessionId);
    const refunded    = _totalRefunded(sessionId);
    const remaining   = Math.max(0, session.amount - refunded);

    return {
      charged:   session.amount,
      refunded,
      remaining,
      status:    session.status,
    };
  },

  // ─── Stats (admin dashboard) ───────────────────────────────────────────────

  stats(): {
    total_sessions: number;
    captured: number;
    pending: number;
    cancelled: number;
    total_revenue_cents: number;
    total_refunded_cents: number;
  } {
    const all = [...sessions.values()];

    const totalRevenue  = all
      .filter((s) => s.status === "captured")
      .reduce((sum, s) => sum + s.amount, 0);

    const totalRefunded = [...refunds.values()]
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      total_sessions:      all.length,
      captured:            all.filter((s) => s.status === "captured").length,
      pending:             all.filter((s) => s.status === "pending").length,
      cancelled:           all.filter((s) => s.status === "cancelled").length,
      total_revenue_cents: totalRevenue,
      total_refunded_cents: totalRefunded,
    };
  },
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

function _totalRefunded(sessionId: string): number {
  return [...refunds.values()]
    .filter((r) => {
      const sid = orderSessionIndex.get(r.order_id);
      return sid === sessionId;
    })
    .reduce((sum, r) => sum + r.amount, 0);
}
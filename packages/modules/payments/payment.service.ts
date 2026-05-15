

import { type PaymentSession, type Refund } from "../../core/types";
import { generateId, formatMoney, sleep } from "../../core/utils";
import { eventBus, EVENT } from "../../core/event-bus";
import { ServiceError } from "../products/product.service";



export type PaymentProvider = "stripe" | "manual";

export interface InitiatePaymentInput {
  order_id: string;
  amount: number;           
  currency?: string;        
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
  amount: number;           
  reason?: string;
}



const sessions = new Map<string, PaymentSession>();
const refunds  = new Map<string, Refund>();


const orderSessionIndex = new Map<string, string>();



export const PaymentService = {

  

  async initiate(input: InitiatePaymentInput): Promise<PaymentSession> {
    const {
      order_id,
      amount,
      currency    = "usd",
      provider    = "stripe",
      customer_email,
    } = input;

    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
      throw new ServiceError("INVALID_AMOUNT", "Payment amount must be a valid number greater than zero");
    }

    
    const existingSessionId = orderSessionIndex.get(order_id);
    if (existingSessionId) {
      const existing = sessions.get(existingSessionId);
      if (existing && existing.status === "pending") {
        existing.status = "cancelled";
        sessions.set(existingSessionId, existing);
      }
    }

    await sleep(200);

    const session: PaymentSession = {
      id:          generateId("ps"),
      provider_id: provider,
      status:      "pending",
      amount,
      data:        {},
    };

    
    if (provider === "stripe") {
      
      session.data = {
        client_secret:      `pi_mock_${session.id}_secret_${Math.random().toString(36).slice(2)}`,
        payment_intent_id:  `pi_mock_${session.id}`,
        currency,
        customer_email,
      };
    }

    if (provider === "manual") {
      
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

  

  async capture(input: CapturePaymentInput): Promise<PaymentSession> {
    const { session_id, order_id } = input;
    const session = PaymentService.getSession(session_id);

    if (!["authorized", "pending"].includes(session.status)) {
      throw new ServiceError(
        "INVALID_STATUS",
        `Cannot capture a payment with status "${session.status}"`,
      );
    }

    await sleep(300);

    

    session.status = "captured";
    sessions.set(session_id, session);

    await eventBus.emit(EVENT.PAYMENT_CAPTURED, {
      order_id,
      amount: session.amount,
    });

    return session;
  },

  

  async refund(input: RefundPaymentInput): Promise<Refund> {
    const { session_id, order_id, amount, reason = "customer_request" } = input;

    const session = PaymentService.getSession(session_id);

    if (session.status !== "captured") {
      throw new ServiceError(
        "INVALID_STATUS",
        `Can only refund a captured payment (current status: "${session.status}")`,
      );
    }

    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
      throw new ServiceError("INVALID_AMOUNT", "Refund amount must be a valid number greater than zero");
    }

    
    const alreadyRefunded = _totalRefunded(session_id);
    const remaining       = session.amount - alreadyRefunded;

    if (amount > remaining) {
      throw new ServiceError(
        "REFUND_EXCEEDS_CHARGE",
        `Refund of ${formatMoney(amount)} exceeds remaining refundable amount of ${formatMoney(remaining)}`,
      );
    }

    await sleep(400); 

    // Race condition fix: Re-verify after sleep
    const currentAlreadyRefunded = _totalRefunded(session_id);
    const currentRemaining = session.amount - currentAlreadyRefunded;
    if (amount > currentRemaining) {
      throw new ServiceError(
        "REFUND_EXCEEDS_CHARGE",
        `Concurrent refund detected. Refund of ${formatMoney(amount)} exceeds remaining refundable amount of ${formatMoney(currentRemaining)}`,
      );
    } 

    

    const refund: Refund = {
      id:         generateId("ref"),
      order_id,
      amount,
      reason,
      created_at: new Date().toISOString(),
    };

    refunds.set(refund.id, refund);

    
    const newTotal = alreadyRefunded + amount;
    if (newTotal >= session.amount) {
      session.status = "captured"; 
    }
    sessions.set(session_id, session);

    await eventBus.emit(EVENT.PAYMENT_REFUNDED, { order_id, amount });

    return refund;
  },


  async cancelSession(sessionId: string, orderId: string): Promise<PaymentSession> {
    const session = PaymentService.getSession(sessionId);

    if (session.status === "captured") {
      throw new ServiceError(
        "ALREADY_CAPTURED",
        "Cannot cancel a captured payment — issue a refund instead",
      );
    }

    await sleep(150);


    session.status = "cancelled";
    sessions.set(sessionId, session);

    await eventBus.emit(EVENT.PAYMENT_FAILED, {
      order_id: orderId,
      error:    "Payment session cancelled",
    });

    return session;
  },


  async handleStripeWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{ received: boolean }> {
    
    console.log("[PaymentService] Stripe webhook received (mock):", signature.slice(0, 20));
    return { received: true };
  },

  

  getRefunds(sessionId: string): Refund[] {
    return [...refunds.values()].filter(
      (r) => {
        
        const sid = orderSessionIndex.get(r.order_id);
        return sid === sessionId;
      },
    );
  },

  

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



function _totalRefunded(sessionId: string): number {
  return [...refunds.values()]
    .filter((r) => {
      const sid = orderSessionIndex.get(r.order_id);
      return sid === sessionId;
    })
    .reduce((sum, r) => sum + r.amount, 0);
}
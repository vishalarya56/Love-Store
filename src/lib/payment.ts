// Payment provider abstraction.
// Production: RazorpayPaymentProvider.
// Sandbox/tests/demo: FakePaymentProvider.

export interface CreateOrderInput {
  creatorId: string;
  amount: number; // in paise
  currency: string;
  credits: number;
}

export interface CreateOrderResult {
  provider: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  credits: number;
  // For real Razorpay: would also include key_id for checkout.
  keyId?: string;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature?: string;
  expectedAmount: number;
  expectedCurrency: string;
  expectedCredits: number;
}

export interface VerifyPaymentResult {
  ok: boolean;
  providerOrderId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  credits: number;
  failureReason?: string;
}

export interface PaymentProvider {
  name: string;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}

// ---- FakePaymentProvider (demo / tests) ----
// Orders are deterministic and verifiable without any third party.
// Order id format: fake_order_<random>. Payment id: fake_pay_<order tail>.
// Signature = sha256(orderId + paymentId + "lovestory-secret") — recomputable
// deterministically on both sides, so no in-memory order store is needed (which
// wouldn't survive Next.js dev module reloading between route handlers).
//
// The server is authoritative for amount/currency/credits: it stores them in the
// Payment row at create-order time and passes them as `expected*` here. The fake
// provider verifies the signature and trusts the server-supplied expected values
// (a real provider like Razorpay would fetch the actual payment and compare).

import { createHash, randomBytes } from "crypto";

function fakeSignature(orderId: string, paymentId: string): string {
  return createHash("sha256")
    .update(`${orderId}|${paymentId}|lovestory-fake-secret`)
    .digest("hex");
}

export const FakePaymentProvider: PaymentProvider = {
  name: "fake",
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const rand = randomBytes(6).toString("hex");
    return {
      provider: "fake",
      providerOrderId: `fake_order_${rand}`,
      amount: input.amount,
      currency: input.currency,
      credits: input.credits,
      keyId: "fake_key_demo",
    };
  },
  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const okSig =
      !input.signature ||
      input.signature === fakeSignature(input.providerOrderId, input.providerPaymentId);
    if (!okSig) {
      return {
        ok: false,
        providerOrderId: input.providerOrderId,
        providerPaymentId: input.providerPaymentId,
        amount: input.expectedAmount,
        currency: input.expectedCurrency,
        credits: 0,
        failureReason: "Invalid signature.",
      };
    }
    return {
      ok: true,
      providerOrderId: input.providerOrderId,
      providerPaymentId: input.providerPaymentId,
      amount: input.expectedAmount,
      currency: input.expectedCurrency,
      credits: input.expectedCredits,
    };
  },
};

export function fakeSignatureFor(orderId: string, paymentId: string): string {
  return fakeSignature(orderId, paymentId);
}

// Pricing
export const PAYMENT_AMOUNT = 900; // ₹9 in paise
export const PAYMENT_CURRENCY = "INR";
export const PAYMENT_CREDITS = 2;

export function getPaymentProvider(): PaymentProvider {
  // Always fake in sandbox. Real Razorpay would be wired here.
  return FakePaymentProvider;
}

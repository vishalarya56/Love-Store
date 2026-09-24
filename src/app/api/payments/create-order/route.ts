import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import {
  getPaymentProvider,
  PAYMENT_AMOUNT,
  PAYMENT_CURRENCY,
  PAYMENT_CREDITS,
  fakeSignatureFor,
} from "@/lib/payment";

// POST /api/payments/create-order
// Server decides amount, currency and credits. Never trusts client values.
export const POST = withErrorHandling(async (_req: NextRequest) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("paymentOrder", `u:${session.creatorId}`);
  if (rl) return rl;

  const provider = getPaymentProvider();
  const order = await provider.createOrder({
    creatorId: session.creatorId,
    amount: PAYMENT_AMOUNT,
    currency: PAYMENT_CURRENCY,
    credits: PAYMENT_CREDITS,
  });

  const payment = await db.payment.create({
    data: {
      creatorId: session.creatorId,
      amount: PAYMENT_AMOUNT,
      currency: PAYMENT_CURRENCY,
      creditsGranted: PAYMENT_CREDITS,
      provider: provider.name,
      providerOrderId: order.providerOrderId,
      status: "CREATED",
    },
  });

  // For the fake provider, expose the payment id + signature the client should
  // send back to /verify, so the demo "checkout" is deterministic.
  const fakePaymentId = `fake_pay_${order.providerOrderId.slice(-12)}`;
  const fakeSignature = fakeSignatureFor(order.providerOrderId, fakePaymentId);

  return ok({
    paymentId: payment.id,
    provider: provider.name,
    providerOrderId: order.providerOrderId,
    amount: PAYMENT_AMOUNT,
    currency: PAYMENT_CURRENCY,
    credits: PAYMENT_CREDITS,
    keyId: order.keyId,
    fakePaymentId: provider.name === "fake" ? fakePaymentId : undefined,
    fakeSignature: provider.name === "fake" ? fakeSignature : undefined,
  });
});

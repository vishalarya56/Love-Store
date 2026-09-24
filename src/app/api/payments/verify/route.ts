import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { verifyPaymentSchema } from "@/lib/validation";
import {
  getPaymentProvider,
  PAYMENT_AMOUNT,
  PAYMENT_CURRENCY,
  PAYMENT_CREDITS,
} from "@/lib/payment";
import { withIdempotency } from "@/lib/idempotency";
import { ZodError } from "zod";

// POST /api/payments/verify
// Server-side verification with idempotency + duplicate payment protection.
// Atomic credit grant inside a transaction.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("paymentVerify", `u:${session.creatorId}`);
  if (rl) return rl;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  let parsed;
  try {
    parsed = verifyPaymentSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Missing payment details.");
    }
    throw e;
  }

  // Find the order created by this creator.
  const payment = await db.payment.findUnique({
    where: { providerOrderId: parsed.providerOrderId },
  });
  if (!payment || payment.creatorId !== session.creatorId) {
    return fail("PAYMENT_FAILED", "We couldn't find this payment. Please try again.");
  }

  // Idempotency: if this payment is already PAID, replay the result without
  // granting duplicate credits.
  if (payment.status === "PAID") {
    const wallet = await db.creditWallet.findUnique({ where: { creatorId: session.creatorId } });
    return ok({
      replay: true,
      alreadyPaid: true,
      paymentId: payment.id,
      total: wallet?.totalCredits ?? 0,
      used: wallet?.usedCredits ?? 0,
      remaining: (wallet?.totalCredits ?? 0) - (wallet?.usedCredits ?? 0),
      creditsGranted: payment.creditsGranted,
    });
  }

  // Independent server-side verification.
  const provider = getPaymentProvider();
  const result = await provider.verifyPayment({
    providerOrderId: parsed.providerOrderId,
    providerPaymentId: parsed.providerPaymentId,
    signature: parsed.signature,
    expectedAmount: PAYMENT_AMOUNT,
    expectedCurrency: PAYMENT_CURRENCY,
    expectedCredits: PAYMENT_CREDITS,
  });
  if (!result.ok) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", providerPaymentId: parsed.providerPaymentId, signature: parsed.signature ?? null },
    });
    return fail("PAYMENT_INVALID_SIGNATURE", result.failureReason ?? "Payment verification failed.");
  }

  // Atomic transaction: mark payment PAID + grant credits (with an idempotency
  // key scoped to this order so concurrent retries are safe).
  const outcome = await withIdempotency(
    session.creatorId,
    `verify:${payment.providerOrderId}`,
    "payment_verify",
    async () => {
      return await db.$transaction(async (tx) => {
        // Lock the payment row by re-reading inside the transaction.
        const fresh = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
        if (fresh.status === "PAID") {
          // someone else already paid under a concurrent request
          const w = await tx.creditWallet.findUniqueOrThrow({ where: { creatorId: session.creatorId } });
          return {
            total: w.totalCredits,
            used: w.usedCredits,
            remaining: w.totalCredits - w.usedCredits,
            creditsGranted: fresh.creditsGranted,
          };
        }
        // Mark PAID
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAID",
            providerPaymentId: parsed.providerPaymentId,
            signature: parsed.signature ?? null,
            verifiedAt: new Date(),
          },
        });
        // Ensure wallet exists, then grant credits atomically.
        let wallet = await tx.creditWallet.findUnique({ where: { creatorId: session.creatorId } });
        if (!wallet) {
          wallet = await tx.creditWallet.create({ data: { creatorId: session.creatorId } });
        }
        const updated = await tx.creditWallet.update({
          where: { creatorId: session.creatorId },
          data: { totalCredits: { increment: payment.creditsGranted } },
        });
        return {
          total: updated.totalCredits,
          used: updated.usedCredits,
          remaining: updated.totalCredits - updated.usedCredits,
          creditsGranted: payment.creditsGranted,
        };
      });
    }
  );

  return ok({
    replay: outcome.replay,
    paymentId: payment.id,
    ...outcome.result,
  });
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard, getClientId } from "@/lib/rate-limit";
import { createSession, setSessionCookie } from "@/lib/auth";
import { phoneSchema } from "@/lib/validation";
import { ZodError } from "zod";

// POST /api/auth/verify-otp
export const POST = withErrorHandling(async (req: Request) => {
  const ip = getClientId(req);
  const rl = rateLimitGuard("otpSend", ip);
  if (rl) return rl;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }

  let phone: string;
  let code: string;
  try {
    const parsed = (body as { phone?: string; code?: string }) || {};
    phone = phoneSchema.parse(parsed.phone ?? "");
    code = String(parsed.code ?? "").trim();
  } catch (e) {
    if (e instanceof ZodError) {
      return fail("VALIDATION_INVALID_PHONE", "Please enter a valid Indian mobile number.");
    }
    throw e;
  }

  if (!/^\d{6}$/.test(code)) {
    return fail("AUTH_INVALID_OTP", "Enter the 6-digit code we sent.");
  }

  const otp = await db.otpRequest.findFirst({
    where: { phone, consumed: false, code },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) {
    return fail("AUTH_INVALID_OTP", "That code is incorrect. Please try again.");
  }
  if (otp.expiresAt < new Date()) {
    return fail("AUTH_EXPIRED_OTP", "That code has expired. Please request a new one.");
  }

  await db.otpRequest.update({ where: { id: otp.id }, data: { consumed: true } });

  const creator = await db.creator.findUnique({ where: { phone } });
  if (!creator) {
    return fail("AUTH_REQUIRED", "Please request a code first.");
  }

  const existingWallet = await db.creditWallet.findUnique({ where: { creatorId: creator.id } });
  if (!existingWallet) {
    await db.creditWallet.create({ data: { creatorId: creator.id } });
  }

  const token = await createSession(creator.id);
  await setSessionCookie(token);

  return ok({
    creatorId: creator.id,
    name: creator.name,
    phone: creator.phone,
  });
});

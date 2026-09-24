import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard, getClientId } from "@/lib/rate-limit";
import { creatorNameSchema, phoneSchema } from "@/lib/validation";
import { randomInt } from "crypto";
import { ZodError } from "zod";

// POST /api/auth/send-otp
// Demo OTP auth: generates a 6-digit code, stores it, and returns the code
// in the response (for demo convenience — shown in the UI so the user can
// complete the flow without a real SMS gateway).
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

  let name: string;
  let phone: string;
  try {
    const parsed = (body as { name?: string; phone?: string }) || {};
    name = creatorNameSchema.parse(parsed.name ?? "");
    phone = phoneSchema.parse(parsed.phone ?? "");
  } catch (e) {
    if (e instanceof ZodError) {
      const fe: Record<string, string> = {};
      for (const issue of e.issues) {
        const key = issue.path[0] as string | undefined;
        if (key && !fe[key]) fe[key] = issue.message;
      }
      return fail("VALIDATION_ERROR", "Please check your details.", { fieldErrors: fe });
    }
    throw e;
  }

  // Find or create creator (without committing a session yet).
  let creator = await db.creator.findUnique({ where: { phone } });
  if (!creator) {
    creator = await db.creator.create({ data: { name, phone } });
  } else if (creator.name !== name) {
    creator = await db.creator.update({ where: { id: creator.id }, data: { name } });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.otpRequest.create({
    data: { creatorId: creator.id, phone, code, expiresAt },
  });

  return ok({ otp: code, phone }, 200);
});

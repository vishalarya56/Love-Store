import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

interface LimitConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  public: { limit: 120, windowMs: 60_000 },
  draftRead: { limit: 120, windowMs: 60_000 },
  draftWrite: { limit: 60, windowMs: 60_000 },
  generation: { limit: 5, windowMs: 600_000 },
  paymentOrder: { limit: 5, windowMs: 600_000 },
  paymentVerify: { limit: 10, windowMs: 600_000 },
  imageUpload: { limit: 20, windowMs: 600_000 },
  otpSend: { limit: 10, windowMs: 600_000 },
} satisfies Record<string, LimitConfig>;

export type RateLimitKey = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

export function checkRateLimit(
  key: RateLimitKey,
  identifier: string
): RateLimitResult {
  const cfg = RATE_LIMITS[key];
  const bucketKey = `${key}:${identifier}`;
  const now = Date.now();
  const existing = store.get(bucketKey);
  if (!existing || existing.resetAt < now) {
    store.set(bucketKey, { count: 1, resetAt: now + cfg.windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (existing.count >= cfg.limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }
  existing.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Returns a 429 response if rate limited, otherwise null. */
export function rateLimitGuard(
  key: RateLimitKey,
  identifier: string
): NextResponse | null {
  const res = checkRateLimit(key, identifier);
  if (!res.ok) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please slow down.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(res.retryAfter) },
      }
    );
  }
  return null;
}

/** Get a client IP-ish identifier from a request. */
export function getClientId(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "anon";
}

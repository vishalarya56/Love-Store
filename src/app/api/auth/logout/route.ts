import { ok, withErrorHandling } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

// POST /api/auth/logout
export const POST = withErrorHandling(async () => {
  await clearSessionCookie();
  return ok({ ok: true });
});

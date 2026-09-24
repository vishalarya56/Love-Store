import { ok, withErrorHandling } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";

// GET /api/auth/session  — current session (lightweight)
export const GET = withErrorHandling(async () => {
  const s = await getAuthSession();
  if (!s) return ok({ authenticated: false });
  return ok({ authenticated: true, creatorId: s.creatorId, name: s.name, phone: s.phone });
});

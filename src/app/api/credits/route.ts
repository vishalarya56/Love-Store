import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard, getClientId } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";

// GET /api/credits
export const GET = withErrorHandling(async (req: Request) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftRead", `u:${session.creatorId}`);
  if (rl) return rl;

  const ip = getClientId(req);
  // light public rate limit not needed for authed; skip.

  let wallet = await db.creditWallet.findUnique({
    where: { creatorId: session.creatorId },
  });
  if (!wallet) {
    wallet = await db.creditWallet.create({ data: { creatorId: session.creatorId } });
  }
  const remaining = wallet.totalCredits - wallet.usedCredits;
  return ok({
    total: wallet.totalCredits,
    used: wallet.usedCredits,
    remaining,
  });
});

// silence unused ip import warning for the public guard semantics
void getClientId;

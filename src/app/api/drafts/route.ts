import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { toDraftDTO } from "@/lib/dto";

// POST /api/drafts  — create a new empty draft for the authenticated creator.
export const POST = withErrorHandling(async () => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftWrite", `u:${session.creatorId}`);
  if (rl) return rl;

  const draft = await db.loveDraft.create({
    data: { creatorId: session.creatorId },
  });
  return ok(await toDraftDTO(draft));
});

// GET /api/drafts  — list the creator's drafts (most recent first).
export const GET = withErrorHandling(async () => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftRead", `u:${session.creatorId}`);
  if (rl) return rl;

  const drafts = await db.loveDraft.findMany({
    where: { creatorId: session.creatorId },
    orderBy: { updatedAt: "desc" },
  });
  const out = [];
  for (const d of drafts) {
    out.push(await toDraftDTO(d));
  }
  return ok(out);
});

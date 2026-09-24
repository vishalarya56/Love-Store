import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { deleteImageFile } from "@/lib/storage";

// DELETE /api/websites/:websiteId
// Soft-deletes a published website (status -> DELETED) and removes its image
// files. The slug is freed for reuse on a future publication.
export const DELETE = withErrorHandling(async (_req: NextRequest, ctx: { params: Promise<{ websiteId: string }> }) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftWrite", `u:${session.creatorId}`);
  if (rl) return rl;
  const { websiteId } = await ctx.params;
  const w = await db.loveWebsite.findUnique({ where: { id: websiteId } });
  if (!w || w.creatorId !== session.creatorId) {
    return fail("RESOURCE_NOT_FOUND", "Website not found.");
  }
  await db.loveWebsite.update({
    where: { id: websiteId },
    data: { status: "DELETED" },
  });
  const imgs = await db.image.findMany({ where: { websiteId } });
  for (const img of imgs) {
    await deleteImageFile(img.storagePath).catch(() => {});
  }
  await db.image.deleteMany({ where: { websiteId } });
  // Allow the source draft to be re-published.
  await db.loveDraft.updateMany({
    where: { id: w.draftId },
    data: { status: "DRAFT" },
  });
  return ok({ deleted: true });
});

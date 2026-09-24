import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { toWebsiteDTO } from "@/lib/dto";
import { deleteImageFile } from "@/lib/storage";

// GET /api/websites — list the creator's published websites.
export const GET = withErrorHandling(async () => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftRead", `u:${session.creatorId}`);
  if (rl) return rl;
  const websites = await db.loveWebsite.findMany({
    where: { creatorId: session.creatorId },
    orderBy: { publishedAt: "desc" },
  });
  return ok(websites.map(toWebsiteDTO));
});

// (DELETE is on /api/websites/:websiteId)

// helper for delete route
export async function softDeleteWebsite(websiteId: string, creatorId: string) {
  const w = await db.loveWebsite.findUnique({ where: { id: websiteId } });
  if (!w || w.creatorId !== creatorId) return null;
  await db.loveWebsite.update({
    where: { id: websiteId },
    data: { status: "DELETED" },
  });
  // Best-effort cleanup of image files.
  const imgs = await db.image.findMany({ where: { websiteId } });
  for (const img of imgs) {
    await deleteImageFile(img.storagePath).catch(() => {});
  }
  await db.image.deleteMany({ where: { websiteId } });
  await db.loveDraft.updateMany({
    where: { id: w.draftId },
    data: { status: "DRAFT" },
  });
  return true;
}

void softDeleteWebsite;

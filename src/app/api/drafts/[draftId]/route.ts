import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { draftPatchSchema } from "@/lib/validation";
import { toDraftDTO } from "@/lib/dto";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ draftId: string }> };

// GET /api/drafts/:draftId
export const GET = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftRead", `u:${session.creatorId}`);
  if (rl) return rl;
  const { draftId } = await ctx.params;
  const draft = await db.loveDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.creatorId !== session.creatorId) {
    return fail("RESOURCE_NOT_FOUND", "Draft not found.");
  }
  return ok(await toDraftDTO(draft));
});

// PATCH /api/drafts/:draftId
export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftWrite", `u:${session.creatorId}`);
  if (rl) return rl;
  const { draftId } = await ctx.params;
  const draft = await db.loveDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.creatorId !== session.creatorId) {
    return fail("RESOURCE_NOT_FOUND", "Draft not found.");
  }
  if (draft.status !== "DRAFT" && draft.status !== "READY_TO_PUBLISH" && draft.status !== "PUBLICATION_FAILED") {
    return fail("DRAFT_LOCKED", "This draft can no longer be edited.");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  let patch;
  try {
    patch = draftPatchSchema.parse(body);
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
  // Re-evaluate readiness when content changes.
  const merged = { ...draft, ...patch } as typeof patch & typeof draft;
  const ready = !!(
    merged.creatorName && merged.phone && merged.emotion && merged.partnerName &&
    merged.story && merged.specialMessage && merged.shareConsent
  );
  const nextStatus = ready ? "READY_TO_PUBLISH" : "DRAFT";
  const updated = await db.loveDraft.update({
    where: { id: draftId },
    data: { ...patch, status: nextStatus },
  });
  return ok(await toDraftDTO(updated));
});

// DELETE /api/drafts/:draftId
export const DELETE = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftWrite", `u:${session.creatorId}`);
  if (rl) return rl;
  const { draftId } = await ctx.params;
  const draft = await db.loveDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.creatorId !== session.creatorId) {
    return fail("RESOURCE_NOT_FOUND", "Draft not found.");
  }
  // If a website was generated from this draft, do not allow hard delete.
  const website = await db.loveWebsite.findUnique({ where: { draftId } });
  if (website) {
    return fail("DRAFT_LOCKED", "This draft has already been published and cannot be deleted.");
  }
  // Delete draft images (file + record).
  const imgs = await db.image.findMany({ where: { draftId } });
  for (const img of imgs) {
    const { deleteImageFile } = await import("@/lib/storage");
    await deleteImageFile(img.storagePath).catch(() => {});
  }
  await db.image.deleteMany({ where: { draftId } });
  await db.loveDraft.delete({ where: { id: draftId } });
  return ok({ deleted: true });
});

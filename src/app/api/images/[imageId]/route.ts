import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { imagePatchSchema } from "@/lib/validation";
import { deleteImageFile } from "@/lib/storage";
import { toDraftDTO } from "@/lib/dto";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ imageId: string }> };

// PATCH /api/images/:imageId  — update caption / sortOrder
export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftWrite", `u:${session.creatorId}`);
  if (rl) return rl;
  const { imageId } = await ctx.params;
  const img = await db.image.findUnique({ where: { id: imageId } });
  if (!img || img.creatorId !== session.creatorId) {
    return fail("RESOURCE_NOT_FOUND", "Image not found.");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  let patch;
  try {
    patch = imagePatchSchema.parse(body);
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
  const updated = await db.image.update({
    where: { id: imageId },
    data: { caption: patch.caption, sortOrder: patch.sortOrder ?? img.sortOrder },
  });
  // return the owning draft dto for convenience
  const owner = updated.draftId ?? null;
  if (owner) {
    const draft = await db.loveDraft.findUnique({ where: { id: owner } });
    return ok(await toDraftDTO(draft!));
  }
  return ok({ id: updated.id, caption: updated.caption, sortOrder: updated.sortOrder });
});

// DELETE /api/images/:imageId
export const DELETE = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("draftWrite", `u:${session.creatorId}`);
  if (rl) return rl;
  const { imageId } = await ctx.params;
  const img = await db.image.findUnique({ where: { id: imageId } });
  if (!img || img.creatorId !== session.creatorId) {
    return fail("RESOURCE_NOT_FOUND", "Image not found.");
  }
  // If the image belongs to a published website, block deletion.
  if (img.websiteId) {
    return fail("DRAFT_LOCKED", "This image is part of a published website.");
  }
  await db.image.update({
    where: { id: imageId },
    data: { state: "DELETING" },
  });
  await deleteImageFile(img.storagePath).catch(() => {});
  await db.image.delete({ where: { id: imageId } }).catch(() => {});
  const draft = img.draftId
    ? await db.loveDraft.findUnique({ where: { id: img.draftId } })
    : null;
  if (draft) return ok(await toDraftDTO(draft));
  return ok({ deleted: true });
});

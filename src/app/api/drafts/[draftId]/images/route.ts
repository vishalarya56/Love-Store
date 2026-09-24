import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { processAndStoreImage, newImageId, StorageError } from "@/lib/storage";
import { toDraftDTO } from "@/lib/dto";

// POST /api/drafts/:draftId/images
// Multipart form-data: field "file" = image binary
export const POST = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ draftId: string }> }) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("imageUpload", `u:${session.creatorId}`);
  if (rl) return rl;
  const { draftId } = await ctx.params;
  const draft = await db.loveDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.creatorId !== session.creatorId) {
    return fail("RESOURCE_NOT_FOUND", "Draft not found.");
  }
  if (draft.status !== "DRAFT" && draft.status !== "READY_TO_PUBLISH" && draft.status !== "PUBLICATION_FAILED") {
    return fail("DRAFT_LOCKED", "This draft can no longer be edited.");
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return fail("IMAGE_INVALID", "Please select an image file.");
  }

  // Enforce 2–4 image limit.
  const existingCount = await db.image.count({
    where: { draftId, state: { not: "DELETED" } },
  });
  if (existingCount >= 4) {
    return fail("IMAGE_LIMIT", "You can upload at most 4 images.");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const imageId = newImageId();

  // Create image record in SELECTED state, then transition through processing.
  const sortOrder = existingCount; // append at end
  let image;
  try {
    image = await db.image.create({
      data: {
        creatorId: session.creatorId,
        draftId,
        storagePath: "pending",
        mimeType: "image/webp",
        width: 0,
        height: 0,
        sizeBytes: 0,
        state: "VALIDATING",
        sortOrder,
      },
    });
  } catch (e) {
    console.error("[img] create record failed", e);
    return fail("DATABASE_ERROR", "Could not create image record.");
  }

  try {
    const processed = await processAndStoreImage(buf, file.type || "application/octet-stream", imageId);
    const updated = await db.image.update({
      where: { id: image.id },
      data: {
        storagePath: processed.storagePath,
        mimeType: processed.mimeType,
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.sizeBytes,
        state: "READY",
      },
    });
    image = updated;
  } catch (e) {
    const code = e instanceof StorageError ? e.code : "IMAGE_CORRUPT";
    const msg = e instanceof Error ? e.message : "Image processing failed.";
    await db.image.update({
      where: { id: image.id },
      data: { state: "FAILED" },
    }).catch(() => {});
    return fail(code as never, msg);
  }

  const fresh = await db.loveDraft.findUnique({ where: { id: draftId } });
  return ok(await toDraftDTO(fresh!));
});

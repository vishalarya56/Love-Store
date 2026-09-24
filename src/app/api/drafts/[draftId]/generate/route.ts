import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth";
import { draftReadySchema } from "@/lib/validation";
import { generateSlug } from "@/lib/slug";
import { withIdempotency } from "@/lib/idempotency";
import { toWebsiteDTO } from "@/lib/dto";
import { Prisma } from "@prisma/client";

// POST /api/drafts/:draftId/generate
// Atomic generation transaction:
//   lock credit row → verify remaining ≥ 1 → lock draft → validate →
//   validate 2–4 READY images → create website → transfer images →
//   consume 1 credit → publish. All inside one transaction.
export const POST = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ draftId: string }> }) => {
  const session = await requireAuth();
  const rl = rateLimitGuard("generation", `u:${session.creatorId}`);
  if (rl) return rl;
  const { draftId } = await ctx.params;

  // Idempotency on generation per draft: if a website already exists for this
  // draft, return it (no double charge).
  const existing = await db.loveWebsite.findUnique({ where: { draftId } });
  if (existing && existing.status === "PUBLISHED") {
    return ok({ replay: true, website: toWebsiteDTO(existing) });
  }

  const draft = await db.loveDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.creatorId !== session.creatorId) {
    return fail("RESOURCE_NOT_FOUND", "Draft not found.");
  }

  // Validate the draft content is complete & consent given.
  const ready = draftReadySchema.safeParse({
    creatorName: draft.creatorName ?? undefined,
    phone: draft.phone ?? undefined,
    intro: draft.intro ?? undefined,
    emotion: draft.emotion ?? undefined,
    partnerName: draft.partnerName ?? undefined,
    story: draft.story ?? undefined,
    specialMessage: draft.specialMessage ?? undefined,
    finalMessage: draft.finalMessage ?? undefined,
    signature: draft.signature ?? undefined,
    relationship: draft.relationship ?? undefined,
    shareConsent: draft.shareConsent,
  });
  if (!ready.success) {
    const fe: Record<string, string> = {};
    for (const issue of ready.error.issues) {
      const key = issue.path[0] as string | undefined;
      if (key && !fe[key]) fe[key] = issue.message;
    }
    return fail("DRAFT_INVALID", "Please complete all required fields before publishing.", { fieldErrors: fe });
  }

  const readyImages = await db.image.findMany({
    where: { draftId, state: "READY" },
    orderBy: { sortOrder: "asc" },
  });
  if (readyImages.length < 2 || readyImages.length > 4) {
    return fail("IMAGE_LIMIT", "Please upload between 2 and 4 ready images.");
  }

  // Atomically consume a credit + publish. Use a unique idempotency key
  // tied to the draft so retries don't double-charge.
  const idemKey = `generate:${draftId}`;
  try {
    const outcome = await withIdempotency(session.creatorId, idemKey, "generate", async () => {
      return await db.$transaction(async (tx) => {
        // Lock + verify credit.
        const wallet = await tx.creditWallet.findUniqueOrThrow({
          where: { creatorId: session.creatorId },
        });
        const remaining = wallet.totalCredits - wallet.usedCredits;
        if (remaining < 1) {
          throw new GenerateError(
            "CREDIT_INSUFFICIENT",
            "You're out of credits. Buy more to publish another love story."
          );
        }
        // Mark draft transitioning.
        await tx.loveDraft.update({
          where: { id: draftId },
          data: { status: "PUBLISHING" },
        });

        // Generate a unique slug (with retry loop for the rare collision).
        let slug = generateSlug(8);
        for (let attempt = 0; attempt < 5; attempt++) {
          const clash = await tx.loveWebsite.findUnique({ where: { slug } });
          if (!clash) break;
          slug = generateSlug(8);
        }

        // Create the website as a published snapshot.
        const website = await tx.loveWebsite.create({
          data: {
            creatorId: session.creatorId,
            draftId,
            slug,
            status: "PUBLISHED",
            creatorName: draft.creatorName!,
            phone: draft.phone,
            intro: draft.intro,
            emotion: draft.emotion!,
            partnerName: draft.partnerName!,
            relationship: draft.relationship,
            story: draft.story!,
            specialMessage: draft.specialMessage,
            finalMessage: draft.finalMessage,
            signature: draft.signature,
            shareConsent: draft.shareConsent,
            musicEnabled: draft.musicEnabled,
          },
        });

        // Transfer draft images to the website (reassign parent, keep file).
        const imageIds = readyImages.map((i) => i.id);
        await tx.image.updateMany({
          where: { id: { in: imageIds } },
          data: { websiteId: website.id, draftId: null },
        });

        // Consume one credit.
        const updatedWallet = await tx.creditWallet.update({
          where: { creatorId: session.creatorId },
          data: { usedCredits: { increment: 1 } },
        });

        // Mark draft published-ish (we keep it around; can't re-publish).
        await tx.loveDraft.update({
          where: { id: draftId },
          data: { status: "READY_TO_PUBLISH" }, // keeps it editable-blocked via website check elsewhere
        });

        const fullWebsite = await tx.loveWebsite.findUniqueOrThrow({
          where: { id: website.id },
          include: { images: true },
        });
        return {
          slug: fullWebsite.slug,
          websiteId: fullWebsite.id,
          remaining: updatedWallet.totalCredits - updatedWallet.usedCredits,
        };
      });
    });

    const published = await db.loveWebsite.findUniqueOrThrow({
      where: { id: outcome.result.websiteId },
    });
    return ok({ replay: outcome.replay, website: toWebsiteDTO(published) });
  } catch (e) {
    if (e instanceof GenerateError) {
      return fail(e.code as never, e.message);
    }
    // Prisma unique constraint on slug -> retryable, treat as failure for this attempt
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return fail("INTERNAL_ERROR", "Could not publish right now. Please try again.");
    }
    throw e;
  }
});

class GenerateError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

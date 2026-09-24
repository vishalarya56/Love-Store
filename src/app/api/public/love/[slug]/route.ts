import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { rateLimitGuard, getClientId } from "@/lib/rate-limit";
import { toPublicLove } from "@/lib/dto";

// GET /api/public/love/:slug
// Publicly accessible published love website. Only returns data when the
// website is PUBLISHED. Never exposes creator phone, payment ids, etc.
export const GET = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ slug: string }> }) => {
  const ip = getClientId(req);
  const rl = rateLimitGuard("public", ip);
  if (rl) return rl;
  const { slug } = await ctx.params;
  const website = await db.loveWebsite.findUnique({
    where: { slug },
    include: { images: true },
  });
  if (!website || website.status !== "PUBLISHED" || !website.shareConsent) {
    return fail("WEBSITE_NOT_PUBLISHED", "This love story isn't available.");
  }
  return ok(toPublicLove(website));
});

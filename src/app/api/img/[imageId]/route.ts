import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readImageBuffer } from "@/lib/storage";
import { rateLimitGuard, getClientId } from "@/lib/rate-limit";

// GET /api/img/:imageId
// Serves optimized webp images. Access control:
//  - Images attached to a PUBLISHED website are public.
//  - Images still attached to a draft require the authenticated owner.
//  - Images in DELETED state are 404.
export async function GET(req: NextRequest, ctx: { params: Promise<{ imageId: string }> }) {
  const ip = getClientId(req);
  const rl = rateLimitGuard("public", ip);
  if (rl) return rl;

  const { imageId } = await ctx.params;
  const img = await db.image.findUnique({ where: { id: imageId } });
  if (!img) return new NextResponse("Not Found", { status: 404 });
  if (img.state === "DELETED" || img.state === "DELETE_FAILED") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const isPublic = await isImagePublic(img);
  if (!isPublic) {
    // Require owner session via cookie.
    const { getAuthSession } = await import("@/lib/auth");
    const s = await getAuthSession();
    if (!s || s.creatorId !== img.creatorId) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  let buf: Buffer;
  try {
    buf = await readImageBuffer(img.storagePath);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
  const headers = new Headers();
  headers.set("Content-Type", img.mimeType || "image/webp");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  // Immutable long cache for optimized images.
  return new NextResponse(buf, { status: 200, headers });
}

async function isImagePublic(img: { websiteId: string | null; draftId: string | null }) {
  if (img.websiteId) {
    const w = await db.loveWebsite.findUnique({ where: { id: img.websiteId } });
    return w?.status === "PUBLISHED";
  }
  return false;
}

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

// POST /api/seed
// Idempotently seeds a demo love website so the recipient experience is
// viewable without going through the full creator flow. Processes the four
// pre-generated romantic demo images into optimized webp, creates a published
// website with slug "demo".
export const POST = withErrorHandling(async (_req: NextRequest) => {
  const DEMO_SLUG = "demo";
  const existing = await db.loveWebsite.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing && existing.status === "PUBLISHED") {
    return ok({ slug: DEMO_SLUG, url: `/#/love/${DEMO_SLUG}`, seeded: false, alreadyExisted: true });
  }

  const uploadRoot = path.join(process.cwd(), "private", "uploads");
  await fs.mkdir(uploadRoot, { recursive: true });

  // Find a demo creator (or create one).
  const DEMO_PHONE = "9999900000";
  let creator = await db.creator.findUnique({ where: { phone: DEMO_PHONE } });
  if (!creator) {
    creator = await db.creator.create({ data: { name: "Aarav", phone: DEMO_PHONE } });
  }
  // Demo credits so the dashboard is consistent.
  await db.creditWallet.upsert({
    where: { creatorId: creator.id },
    create: { creatorId: creator.id, totalCredits: 1, usedCredits: 1 },
    update: { totalCredits: 1, usedCredits: 1 },
  });

  // Process the four demo PNGs (if present) into webp. Skip missing ones.
  const sources = [
    "demo-memory-1.png",
    "demo-memory-2.png",
    "demo-memory-3.png",
    "demo-memory-4.png",
  ];
  const captions = [
    "The evening everything began 🌅",
    "Your hand fits mine perfectly 🤍",
    "Walking into forever with you 🌊",
    "Softness, everywhere you go 🌸",
  ];

  const imageRecords: { id: string; storagePath: string; width: number; height: number; sizeBytes: number; caption: string }[] = [];
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i]!;
    const abs = path.join(uploadRoot, src);
    let exists = true;
    try {
      await fs.access(abs);
    } catch {
      exists = false;
    }
    if (!exists) continue;
    const buf = await fs.readFile(abs);
    const id = `demoimg${i + 1}`;
    const storagePath = `${id}.webp`;
    const webpBuf = await sharp(buf)
      .resize(1600, 1600, { fit: "inside" })
      .webp({ quality: 82 })
      .toBuffer();
    await fs.writeFile(path.join(uploadRoot, storagePath), webpBuf);
    const meta = await sharp(webpBuf).metadata();
    imageRecords.push({
      id,
      storagePath,
      width: meta.width ?? 864,
      height: meta.height ?? 1152,
      sizeBytes: webpBuf.byteLength,
      caption: captions[i]!,
    });
  }

  // If not all 4 images are ready yet, fail gracefully so the seeder can retry.
  if (imageRecords.length < 4) {
    return fail("INTERNAL_ERROR", `Demo images not ready yet (${imageRecords.length}/4). Try again in a moment.`);
  }

  // Create a demo draft + published website atomically.
  const draft = await db.loveDraft.create({
    data: {
      creatorId: creator.id,
      status: "READY_TO_PUBLISH",
      creatorName: "Aarav",
      phone: DEMO_PHONE,
      intro: "I don't really know where to begin... so I'll just start with the truth.",
      emotion: "love",
      partnerName: "Meera",
      relationship: "the one I'd choose every single time",
      story:
        "Meera, I still remember the first time I heard your laugh. It was this tiny, surprised little sound you made when the auto-rickshaw hit a speed breaker, and somehow that single moment rewrote the rest of my life.\n\nSince then, every ordinary thing has felt a little softer. The rain that ruined my shirt. The coffee that went cold because I was busy texting you. The slow train rides where I'd save a window seat, just in case you'd appear beside me.\n\nI'm not a poet. I don't have the right words for most of this. But if I had to try, I'd say: loving you feels like finally coming home to a house I didn't know I'd been searching for.",
      specialMessage:
        "You make Mondays feel like festivals and storms feel like lullabies. Thank you for being patient with me, for reading my silences, and for never once making me feel like I had to be anyone but myself.",
      finalMessage:
        "And if I could choose again — across every version of every life — I would still, quietly and without hesitation, choose you.",
      signature: "Forever Yours, Aarav ❤️",
      shareConsent: true,
      musicEnabled: true,
    },
  });

  const website = await db.loveWebsite.create({
    data: {
      creatorId: creator.id,
      draftId: draft.id,
      slug: DEMO_SLUG,
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
      shareConsent: true,
      musicEnabled: draft.musicEnabled,
    },
  });

  for (let i = 0; i < imageRecords.length; i++) {
    const r = imageRecords[i]!;
    await db.image.create({
      data: {
        id: r.id,
        creatorId: creator.id,
        websiteId: website.id,
        storagePath: r.storagePath,
        mimeType: "image/webp",
        width: r.width,
        height: r.height,
        sizeBytes: r.sizeBytes,
        caption: r.caption,
        state: "READY",
        sortOrder: i,
      },
    });
  }

  return ok({ slug: DEMO_SLUG, url: `/#/love/${DEMO_SLUG}`, seeded: true });
});

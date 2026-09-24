import { db } from "@/lib/db";
import type { LoveWebsite, Image } from "@prisma/client";

// Public DTO — only intentionally public fields.
export interface PublicLoveImage {
  id: string;
  url: string;
  caption: string | null;
  width: number;
  height: number;
  sortOrder: number;
}

export interface PublicLovePayload {
  slug: string;
  creatorName: string;
  intro: string | null;
  emotion: string;
  partnerName: string;
  relationship: string | null;
  story: string;
  specialMessage: string | null;
  finalMessage: string | null;
  signature: string | null;
  musicEnabled: boolean;
  publishedAt: string;
  images: PublicLoveImage[];
}

export function toPublicLove(
  w: LoveWebsite & { images: Image[] }
): PublicLovePayload {
  return {
    slug: w.slug,
    creatorName: w.creatorName,
    intro: w.intro,
    emotion: w.emotion,
    partnerName: w.partnerName,
    relationship: w.relationship,
    story: w.story,
    specialMessage: w.specialMessage,
    finalMessage: w.finalMessage,
    signature: w.signature,
    musicEnabled: w.musicEnabled,
    publishedAt: w.publishedAt.toISOString(),
    images: w.images
      .filter((i) => i.state === "READY" || i.state === "UPLOADED")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        id: i.id,
        url: `/api/img/${i.id}`,
        caption: i.caption,
        width: i.width,
        height: i.height,
        sortOrder: i.sortOrder,
      })),
  };
}

// Private draft DTO returned to the authenticated creator.
export interface DraftImageDTO {
  id: string;
  url: string;
  caption: string | null;
  width: number;
  height: number;
  state: string;
  sortOrder: number;
}

export interface DraftDTO {
  id: string;
  status: string;
  creatorName: string | null;
  phone: string | null;
  intro: string | null;
  emotion: string | null;
  partnerName: string | null;
  relationship: string | null;
  story: string | null;
  specialMessage: string | null;
  finalMessage: string | null;
  signature: string | null;
  shareConsent: boolean;
  musicEnabled: boolean;
  images: DraftImageDTO[];
  updatedAt: string;
}

export async function toDraftDTO(
  d: Awaited<ReturnType<typeof db.loveDraft.findUnique>>
): Promise<DraftDTO | null> {
  if (!d) return null;
  const images = await db.image.findMany({
    where: {
      OR: [{ draftId: d.id }, { websiteId: null, draftId: d.id }],
    },
  });
  const draftImages = images
    .filter((i) => i.draftId === d.id)
    .filter((i) => i.state !== "DELETED")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({
      id: i.id,
      url: `/api/img/${i.id}`,
      caption: i.caption,
      width: i.width,
      height: i.height,
      state: i.state,
      sortOrder: i.sortOrder,
    }));
  return {
    id: d.id,
    status: d.status,
    creatorName: d.creatorName,
    phone: d.phone,
    intro: d.intro,
    emotion: d.emotion,
    partnerName: d.partnerName,
    relationship: d.relationship,
    story: d.story,
    specialMessage: d.specialMessage,
    finalMessage: d.finalMessage,
    signature: d.signature,
    shareConsent: d.shareConsent,
    musicEnabled: d.musicEnabled,
    images: draftImages,
    updatedAt: d.updatedAt.toISOString(),
  };
}

export interface WebsiteDTO {
  id: string;
  slug: string;
  emotion: string;
  partnerName: string;
  creatorName: string;
  status: string;
  publishedAt: string;
  url: string;
}

export function toWebsiteDTO(
  w: LoveWebsite
): WebsiteDTO {
  return {
    id: w.id,
    slug: w.slug,
    emotion: w.emotion,
    partnerName: w.partnerName,
    creatorName: w.creatorName,
    status: w.status,
    publishedAt: w.publishedAt.toISOString(),
    url: `/#/love/${w.slug}`,
  };
}

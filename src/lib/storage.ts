import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "private", "uploads");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export interface ProcessedImage {
  storagePath: string; // relative path used as public id
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

/**
 * Validate + process an uploaded image buffer.
 * - Validates MIME against magic bytes (does not trust the client)
 * - Validates size <= 10MB
 * - Decodes with sharp to confirm it is a real image
 * - Generates a web-optimized webp variant (max 1600px on the long edge)
 * - Writes to private/uploads/<imageId>.webp
 * - Returns metadata + relative storagePath used as the public imageId.
 */
export async function processAndStoreImage(
  buf: Buffer,
  clientMime: string,
  imageId: string
): Promise<ProcessedImage> {
  await ensureUploadDir();
  if (buf.byteLength > MAX_BYTES) {
    throw new StorageError("IMAGE_TOO_LARGE", "Image must be 10MB or smaller.");
  }

  // Sniff real type from magic bytes.
  const realMime = sniffMime(buf);
  if (!realMime || !ALLOWED_MIME.has(realMime)) {
    throw new StorageError("IMAGE_INVALID", "Only JPG, PNG, WebP, AVIF or GIF images are allowed.");
  }

  let meta;
  try {
    meta = await sharp(buf, { animated: false }).metadata();
  } catch {
    throw new StorageError("IMAGE_CORRUPT", "This image appears to be corrupted.");
  }
  if (!meta.width || !meta.height) {
    throw new StorageError("IMAGE_CORRUPT", "Could not read image dimensions.");
  }

  // Normalize to webp, max 1600 long edge.
  const maxEdge = 1600;
  const longEdge = Math.max(meta.width, meta.height);
  const resizeOpts =
    longEdge > maxEdge
      ? { width: Math.round((meta.width * maxEdge) / longEdge), height: Math.round((meta.height * maxEdge) / longEdge) }
      : undefined;

  let webpBuf: Buffer;
  try {
    webpBuf = await sharp(buf, { animated: false })
      .resize(resizeOpts?.width, resizeOpts?.height, { fit: "inside" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new StorageError("IMAGE_CORRUPT", "Failed to process this image.");
  }

  const storagePath = `${imageId}.webp`;
  const abs = path.join(UPLOAD_ROOT, storagePath);
  await fs.writeFile(abs, webpBuf);

  // Re-read dims of the produced webp.
  const finalMeta = await sharp(webpBuf).metadata();

  return {
    storagePath,
    mimeType: "image/webp",
    width: finalMeta.width ?? meta.width,
    height: finalMeta.height ?? meta.height,
    sizeBytes: webpBuf.byteLength,
  };
}

export async function readImageBuffer(storagePath: string): Promise<Buffer> {
  const abs = path.join(UPLOAD_ROOT, path.basename(storagePath));
  return fs.readFile(abs);
}

export async function deleteImageFile(storagePath: string): Promise<void> {
  const abs = path.join(UPLOAD_ROOT, path.basename(storagePath));
  try {
    await fs.unlink(abs);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw e;
  }
}

export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  )
    return "image/png";
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  // WebP — RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  )
    return "image/webp";
  // AVIF — ftyp box with brand avif/avis
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

export class StorageError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function newImageId(): string {
  return crypto.randomBytes(9).toString("base64url");
}

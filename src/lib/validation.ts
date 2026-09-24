import { z } from "zod";

// Canonical validation layer. The same domain rules are enforced server-side.

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d+]/g, ""))
  .refine((v) => {
    // Accept +91 then 10 digits starting 6-9, or 10 digits starting 6-9.
    const ten = v.replace(/^\+91/, "");
    return /^[6-9]\d{9}$/.test(ten);
  }, "Please enter a valid Indian mobile number.");

export const creatorNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(50, "Name can be at most 50 characters.");

export const partnerNameSchema = creatorNameSchema;

export const storySchema = z
  .string()
  .trim()
  .min(20, "Story must be at least 20 characters.")
  .max(3000, "Story can be at most 3000 characters.");

export const specialMessageSchema = z
  .string()
  .trim()
  .min(5, "Special message must be at least 5 characters.")
  .max(1500, "Special message can be at most 1500 characters.");

export const finalMessageSchema = z
  .string()
  .trim()
  .max(1000, "Final message can be at most 1000 characters.")
  .optional()
  .or(z.literal(""));

export const signatureSchema = z
  .string()
  .trim()
  .max(100, "Signature can be at most 100 characters.")
  .optional()
  .or(z.literal(""));

export const captionSchema = z
  .string()
  .trim()
  .max(200, "Caption can be at most 200 characters.")
  .optional()
  .or(z.literal(""));

export const emotionSchema = z.enum([
  "love",
  "anniversary",
  "proposal",
  "birthday",
  "wedding",
  "long_distance",
  "missing_you",
  "appreciation",
  "cute_sweet",
  "just_because",
]);

export const relationshipSchema = z
  .string()
  .trim()
  .max(60, "Relationship can be at most 60 characters.")
  .optional()
  .or(z.literal(""));

export const introSchema = z
  .string()
  .trim()
  .max(300, "Intro can be at most 300 characters.")
  .optional()
  .or(z.literal(""));

// ---- Partial draft patch schema (for autosave) ----
// Lenient: accepts empty strings and short partial progress while the creator
// is still typing. Readiness (min lengths, valid phone, consent) is enforced
// separately by `draftReadySchema` at generation time, so the autosave never
// blocks typing and never returns 400 on incomplete input.
const lenientPhone = z
  .string()
  .transform((v) => (v ?? "").replace(/[^\d+]/g, ""))
  .optional()
  .or(z.literal(""));
const lenientName = z.string().trim().max(50).optional().or(z.literal(""));
const lenientEmotion = z
  .enum([
    "love", "anniversary", "proposal", "birthday", "wedding",
    "long_distance", "missing_you", "appreciation", "cute_sweet", "just_because",
  ])
  .optional()
  .or(z.literal(""));

export const draftPatchSchema = z.object({
  creatorName: lenientName,
  phone: lenientPhone,
  intro: introSchema.optional(),
  emotion: lenientEmotion,
  partnerName: lenientName,
  relationship: z.string().trim().max(60).optional().or(z.literal("")),
  story: z.string().trim().max(3000).optional().or(z.literal("")),
  specialMessage: z.string().trim().max(1500).optional().or(z.literal("")),
  finalMessage: z.string().trim().max(1000).optional().or(z.literal("")),
  signature: z.string().trim().max(100).optional().or(z.literal("")),
  shareConsent: z.boolean().optional(),
  musicEnabled: z.boolean().optional(),
  status: z.enum(["DRAFT", "READY_TO_PUBLISH", "PUBLICATION_FAILED"]).optional(),
});

export type DraftPatch = z.infer<typeof draftPatchSchema>;

// ---- Draft readiness for generation ----
export const draftReadySchema = z.object({
  creatorName: creatorNameSchema,
  phone: phoneSchema,
  emotion: emotionSchema,
  partnerName: partnerNameSchema,
  story: storySchema,
  specialMessage: specialMessageSchema,
  finalMessage: finalMessageSchema,
  signature: signatureSchema,
  relationship: relationshipSchema,
  intro: introSchema,
  shareConsent: z.literal(true, {
    message: "You must consent to share before publishing.",
  }),
});

export type DraftReady = z.infer<typeof draftReadySchema>;

// ---- Image upload metadata (after processing) ----
export const imageMetaSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string(),
});

// ---- Payment ----
export const createOrderSchema = z.object({
  // none — server decides amount/credits
});

export const verifyPaymentSchema = z.object({
  providerOrderId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  signature: z.string().min(1).optional(),
});

// ---- Image caption patch ----
export const imagePatchSchema = z.object({
  caption: captionSchema,
  sortOrder: z.number().int().optional(),
});

// ---- Public love response ----
export const publicLoveSchema = z.object({
  slug: z.string(),
  emotion: emotionSchema,
  creatorName: z.string(),
  partnerName: z.string(),
});

export type Emotion = z.infer<typeof emotionSchema>;

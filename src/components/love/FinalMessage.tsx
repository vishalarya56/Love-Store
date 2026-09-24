"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Share2, RotateCcw, Heart } from "lucide-react";
import { HeartIcon } from "./anim/HeartIcon";
import { useReducedMotion } from "./ReducedMotionGate";
import { toast } from "@/hooks/use-toast";

export interface FinalMessageProps {
  creatorName: string;
  partnerName: string;
  finalMessage: string | null;
  signature: string | null;
  finalGradient: string;
  accent: string;
  accentSoft: string;
  onReplay: () => void;
}

/**
 * The emotional climax — a dark (or emotion.finalGradient) section with a
 * glowing heart, a cinematic reveal of the final message, the creator's
 * signature, and the sticky footer ("Made with ❤️ especially for you" +
 * Replay / Share buttons).
 *
 * Replay resets the entire experience without a page reload.
 * Share uses navigator.share when available, else copies the URL to the
 * clipboard and shows a toast. Creator phone / private info is never exposed.
 */
export function FinalMessage({
  creatorName,
  partnerName,
  finalMessage,
  signature,
  finalGradient,
  accent,
  accentSoft,
  onReplay,
}: FinalMessageProps) {
  const { reduced } = useReducedMotion();
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleShare = React.useCallback(async () => {
    const title = `${creatorName} sent you a LoveStory`;
    const text = partnerName
      ? `${creatorName} wrote you a love letter 💕 (for ${partnerName})`
      : `${creatorName} wrote you a love letter 💕`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Share it with them — only they will see it.",
        });
        return;
      }
      // Last-resort fallback: select the URL.
      toast({
        title: "Copy this link",
        description: shareUrl,
      });
    } catch (err) {
      // user cancelled share — silently ignore AbortError
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast({
        title: "Couldn't share",
        description: "Please copy the link from the address bar.",
      });
    }
  }, [creatorName, partnerName, shareUrl]);

  const signatureLine = signature && signature.trim().length > 0 ? signature.trim() : "Forever Yours ❤️";

  return (
    <section
      aria-labelledby="final-heading"
      className="relative mt-8 flex min-h-[100svh] flex-col overflow-hidden px-5 py-20 text-center"
      style={{ background: finalGradient }}
    >
      {/* dark-section glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 -z-0 h-72 w-72 -translate-x-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${accentSoft} 0%, rgba(0,0,0,0) 70%)`,
          filter: "blur(28px)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-start">
        <motion.div
          aria-hidden="true"
          className="relative mb-7 grid place-items-center"
          style={{ width: 96, height: 96, color: accent }}
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{
            duration: reduced ? 0.2 : 0.7,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <span
            className={reduced ? undefined : "love-heartbeat"}
            style={{ display: "block", lineHeight: 0 }}
          >
            <HeartIcon width={88} height={82} filled />
          </span>
        </motion.div>

        <motion.h2
          id="final-heading"
          className="love-section-title font-heading font-bold text-white"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.6, ease: "easeOut" }}
        >
          One Last Thing…
        </motion.h2>

        <motion.div
          aria-hidden="true"
          className="mt-3 h-[3px] w-24 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
          initial={{ opacity: 0, scaleX: 0.6 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.7, ease: "easeOut" }}
        />

        {finalMessage && finalMessage.trim().length > 0 ? (
          <motion.blockquote
            className="mt-8 text-balance"
            initial={{ opacity: 0, y: 22, filter: reduced ? "none" : "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: reduced ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="font-heading text-white"
              style={{
                fontSize: "clamp(1.25rem, 5vw, 1.75rem)",
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {finalMessage}
            </p>
          </motion.blockquote>
        ) : null}

        <motion.p
          className="mt-8 font-heading italic text-white/90"
          style={{ fontSize: "clamp(1.1rem, 4vw, 1.4rem)" }}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.7, ease: "easeOut", delay: reduced ? 0 : 0.15 }}
        >
          {signatureLine}
        </motion.p>

        <motion.p
          className="mt-1 text-sm uppercase tracking-wider text-white/60"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.6, delay: reduced ? 0 : 0.3 }}
        >
          — {creatorName}
          {partnerName ? `, for ${partnerName}` : ""}
        </motion.p>
      </div>

      {/* Sticky footer — pushed to bottom when content is short. */}
      <motion.footer
        className="relative mt-auto flex w-full flex-col items-center gap-4 pt-12"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: reduced ? 0.2 : 0.6, ease: "easeOut" }}
      >
        <p className="flex items-center gap-1.5 text-sm text-white/80">
          Made with <Heart className="h-3.5 w-3.5" fill="currentColor" style={{ color: accent }} /> especially for you
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Replay the experience"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Replay
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Share this love letter"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </button>
        </div>

        {/* Mobile safe area: respect bottom safe area insets. */}
        <div aria-hidden="true" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </motion.footer>
    </section>
  );
}

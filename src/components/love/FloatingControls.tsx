"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Music, Share2 } from "lucide-react";
import { useReducedMotion } from "./ReducedMotionGate";
import { toast } from "@/hooks/use-toast";

export interface AmbientMusicHandle {
  enabled: boolean;
  toggle: () => void;
}

interface FloatingControlsProps {
  /** When true, the controls are visible (after the hero is opened). */
  show: boolean;
  /** Creator requested music for this love letter. */
  musicEnabled: boolean;
  /** Ambient music handle (owned by the orchestrator so it survives replay). */
  music: AmbientMusicHandle;
  /** Emotion accent (hex). */
  accent: string;
  /** Creator name + partner name for the share text. */
  creatorName: string;
  partnerName: string;
}

/**
 * Minimal floating controls — music + share. Sits at the top-right corner,
 * mobile-friendly, every button is ≥44×44px. Fades in only after the hero
 * "Open My Surprise" CTA is tapped.
 *
 * Music uses the ambient pad synthesized in `useAmbientMusic` (Web Audio API,
 * no asset, never autoplays). Share uses `navigator.share` when available
 * else copies the URL to the clipboard and shows a toast.
 */
export function FloatingControls({
  show,
  musicEnabled,
  music,
  accent,
  creatorName,
  partnerName,
}: FloatingControlsProps) {
  const { reduced } = useReducedMotion();

  const handleShare = React.useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `${creatorName} sent you a LoveStory`;
    const text = partnerName
      ? `${creatorName} wrote you a love letter 💕 (for ${partnerName})`
      : `${creatorName} wrote you a love letter 💕`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "Share it with them — only they will see it.",
        });
        return;
      }
      toast({ title: "Copy this link", description: url });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast({
        title: "Couldn't share",
        description: "Please copy the link from the address bar.",
      });
    }
  }, [creatorName, partnerName]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="floating-controls"
          className="fixed top-4 right-4 z-40 flex flex-row gap-2"
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ duration: reduced ? 0.18 : 0.35, ease: "easeOut" }}
          aria-label="Quick actions"
        >
          {musicEnabled && (
            <button
              type="button"
              onClick={music.toggle}
              aria-label={music.enabled ? "Mute ambient music" : "Play ambient music"}
              aria-pressed={music.enabled}
              className="love-glass grid h-11 w-11 place-items-center rounded-full text-pink-700 transition-colors hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
              style={{ minWidth: 44, minHeight: 44, color: accent }}
            >
              {music.enabled ? (
                <Music2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Music className="h-5 w-5 opacity-70" aria-hidden="true" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this love letter"
            className="love-glass grid h-11 w-11 place-items-center rounded-full text-pink-700 transition-colors hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            style={{ minWidth: 44, minHeight: 44, color: accent }}
          >
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

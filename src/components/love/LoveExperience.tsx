"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  apiGetLove,
  isApiError,
  type PublicLovePayload,
} from "@/lib/client";
import { getEmotion } from "@/lib/emotions";
import type { Emotion } from "@/lib/validation";

import { ReducedMotionProvider } from "./ReducedMotionGate";
import { LoveBackground } from "./LoveBackground";
import { HeroScreen } from "./HeroScreen";
import { StorySection } from "./StorySection";
import { MemoryGallery } from "./MemoryGallery";
import { FinalMessage } from "./FinalMessage";
import { FloatingControls } from "./FloatingControls";
import { useAmbientMusic } from "./useAmbientMusic";
import { HeartIcon } from "./anim/HeartIcon";

/**
 * LoveExperience — the recipient-facing love letter.
 *
 * Receives a `slug`, fetches `GET /api/public/love/{slug}`, and renders a
 * cinematic, mobile-first, emotion-themed experience:
 *
 *   1. Hero screen (3-second WOW) with a glowing heart + "Open My Surprise 💕"
 *   2. Story section — progressive paragraph reveal inside a glass card
 *   3. Memory gallery — swipeable, snap-scrolling, tap-to-expand
 *   4. Final message — the emotional climax with Replay + Share + sticky footer
 *
 * The ambient music handle is owned here so it survives the Hero→main
 * transition and the Replay action.
 */
export default function LoveExperience({ slug }: { slug: string }) {
  return (
    <ReducedMotionProvider>
      <LoveExperienceInner slug={slug} />
    </ReducedMotionProvider>
  );
}

function LoveExperienceInner({ slug }: { slug: string }) {
  const [data, setData] = React.useState<PublicLovePayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [opened, setOpened] = React.useState(false);
  // bump on replay to re-trigger hero enter animation
  const [replayKey, setReplayKey] = React.useState(0);

  const music = useAmbientMusic();

  // Fetch the public love payload.
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGetLove(slug).then((res) => {
      if (cancelled) return;
      if (isApiError(res)) {
        setError(res.error.message);
        setLoading(false);
        return;
      }
      setData(res.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleOpen = React.useCallback(() => {
    setOpened(true);
    // jump to the top of the experience for the story scroll to begin
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  const handleReplay = React.useCallback(() => {
    setOpened(false);
    setReplayKey((n) => n + 1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  // ---- LOADING state — minimal, no big spinner, just a soft heart pulse. ----
  if (loading) {
    return (
      <div
        className="love-viewport relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden"
        style={{ background: "var(--love-grad-bg)" }}
      >
        <div
          aria-hidden="true"
          className="love-glow love-glow-pulse pointer-events-none absolute h-64 w-64"
          style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
        />
        <span
          className="love-heartbeat block"
          style={{ color: "var(--love-pink-500)" }}
        >
          <HeartIcon width={64} height={60} filled />
        </span>
        <p className="mt-6 text-sm text-[color:var(--love-muted)]">
          Preparing something special…
        </p>
      </div>
    );
  }

  // ---- ERROR state — never leak internals. ----
  if (error || !data) {
    return (
      <div
        className="love-viewport relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6"
        style={{ background: "var(--love-grad-bg)" }}
      >
        <div className="love-glass-strong w-full max-w-md rounded-3xl p-8 text-center">
          <span
            className="mb-4 inline-block"
            style={{ color: "var(--love-pink-500)" }}
          >
            <HeartIcon width={48} height={45} filled />
          </span>
          <h1 className="love-section-title font-heading font-bold text-[color:var(--love-text)]">
            This love letter is out of reach.
          </h1>
          <p className="love-body mt-3 text-[color:var(--love-muted)]">
            {error
              ? error
              : "We couldn't find this letter. Please double-check the link you received."}
          </p>
        </div>
      </div>
    );
  }

  const emotion = getEmotion(data.emotion as Emotion);
  const theme = emotion.theme;

  return (
    <div
      className="love-viewport relative flex min-h-[100svh] flex-col"
      style={{ color: "var(--love-text)" }}
    >
      <LoveBackground theme={theme} />

      <FloatingControls
        show={opened}
        musicEnabled={data.musicEnabled}
        music={music}
        accent={theme.accent}
        creatorName={data.creatorName}
        partnerName={data.partnerName}
      />

      <AnimatePresence mode="wait" initial={false}>
        {!opened ? (
          <HeroScreen
            key={`hero-${replayKey}`}
            theme={{ accent: theme.accent, accentSoft: theme.accentSoft }}
            partnerName={data.partnerName}
            onOpen={handleOpen}
          />
        ) : (
          <motion.main
            key="main"
            className="relative z-10 flex flex-1 flex-col pt-20 sm:pt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          >
            <StorySection
              creatorName={data.creatorName}
              partnerName={data.partnerName}
              relationship={data.relationship}
              intro={data.intro}
              story={data.story}
              specialMessage={data.specialMessage}
              accent={theme.accent}
            />

            {data.images.length > 0 && (
              <MemoryGallery images={data.images} accent={theme.accent} />
            )}

            <FinalMessage
              creatorName={data.creatorName}
              partnerName={data.partnerName}
              finalMessage={data.finalMessage}
              signature={data.signature}
              finalGradient={theme.finalGradient}
              accent={theme.accent}
              accentSoft={theme.accentSoft}
              onReplay={handleReplay}
            />
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

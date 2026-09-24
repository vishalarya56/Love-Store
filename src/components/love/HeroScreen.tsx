"use client";

import * as React from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { HeartIcon } from "./anim/HeartIcon";
import { useReducedMotion } from "./ReducedMotionGate";

export interface HeroScreenTheme {
  accent: string;
  accentSoft: string;
}

interface BurstHeart {
  id: number;
  x: number;
  y: number;
  rotate: number;
  size: number;
  duration: number;
}

/**
 * The first 3-second cinematic WOW screen.
 *
 * Sequence (timings approximate):
 *   0ms    pink cinematic background
 *   200ms  soft glow behind heart fades in
 *   400ms  heart appears (scale 0.6 → 1 + opacity)
 *   700ms  heart gently scales with heartbeat
 *   900ms  "For Someone Special ❤️" reveals
 *   1200ms subtitle reveals
 *   1500ms CTA "Open My Surprise 💕" appears
 *
 * Tapping the heart spawns a handful of tiny heart particles and a small
 * pulse — never hundreds.
 */
export function HeroScreen({
  theme,
  partnerName,
  onOpen,
}: {
  theme: HeroScreenTheme;
  partnerName?: string;
  onOpen: () => void;
}) {
  const { reduced } = useReducedMotion();
  const [bursts, setBursts] = React.useState<BurstHeart[]>([]);
  const idRef = React.useRef(0);

  const spawnBurst = React.useCallback(() => {
    const newOnes: BurstHeart[] = Array.from({ length: 5 }, () => ({
      id: idRef.current++,
      x: (Math.random() - 0.5) * 140,
      y: -60 - Math.random() * 80,
      rotate: (Math.random() - 0.5) * 90,
      size: 12 + Math.random() * 12,
      duration: 700 + Math.random() * 400,
    }));
    setBursts((prev) => [...prev, ...newOnes]);
    const ids = newOnes.map((b) => b.id);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => !ids.includes(b.id)));
    }, 1300);
  }, []);

  const handleHeartTap = React.useCallback(() => {
    spawnBurst();
  }, [spawnBurst]);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: reduced
        ? { duration: 0.2, delay }
        : { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <motion.section
      key="hero"
      aria-label="A little surprise for you"
      className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 py-16 text-center"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.04,
        filter: reduced ? "none" : "blur(4px)",
        transition: { duration: 0.6, ease: "easeInOut" },
      }}
    >
      {/* glow behind heart */}
      <motion.div
        aria-hidden="true"
        className="love-glow love-glow-pulse pointer-events-none absolute"
        style={{
          width: 280,
          height: 280,
          top: "calc(50% - 200px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: `radial-gradient(circle at center, ${theme.accentSoft} 0%, rgba(0,0,0,0) 70%)`,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{
          duration: reduced ? 0.2 : 0.8,
          delay: reduced ? 0 : 0.2,
          ease: "easeOut",
        }}
      />

      {/* heart */}
      <motion.button
        type="button"
        onClick={handleHeartTap}
        aria-label="Tap the heart"
        className="relative mb-8 grid place-items-center focus:outline-none"
        style={{
          width: 96,
          height: 96,
          color: theme.accent,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: reduced ? 0.2 : 0.55,
          delay: reduced ? 0 : 0.4,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        whileHover={reduced ? undefined : { scale: 1.05 }}
        whileTap={reduced ? undefined : { scale: 0.92 }}
      >
        <motion.span
          className={reduced ? undefined : "love-heartbeat"}
          style={{ display: "block", lineHeight: 0 }}
          initial={{ scale: reduced ? 1 : 0.85 }}
          animate={{ scale: 1 }}
          transition={{ delay: reduced ? 0 : 0.7, duration: 0.6 }}
        >
          <HeartIcon width={88} height={82} filled />
        </motion.span>

        {/* tap-burst mini hearts */}
        <AnimatePresence>
          {bursts.map((b) => (
            <motion.span
              key={b.id}
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{ color: theme.accent }}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0.5, rotate: 0 }}
              animate={{
                opacity: 0,
                x: b.x,
                y: b.y,
                scale: 1,
                rotate: b.rotate,
              }}
              transition={{ duration: b.duration / 1000, ease: "easeOut" }}
            >
              <HeartIcon width={b.size} height={b.size} filled />
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.button>

      <motion.h1
        className="love-hero-title font-heading font-bold"
        style={{
          color: "var(--love-text)",
          maxWidth: "20ch",
        }}
        custom={reduced ? 0 : 0.9}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        For Someone Special <span aria-hidden="true">❤️</span>
      </motion.h1>

      <motion.p
        className="love-body mt-4 max-w-md"
        style={{ color: "var(--love-muted)" }}
        custom={reduced ? 0 : 1.2}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        {partnerName ? `For ${partnerName}… ` : ""}A little surprise made just for you…
      </motion.p>

      <motion.div
        className="mt-8"
        custom={reduced ? 0 : 1.5}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <motion.button
          type="button"
          onClick={onOpen}
          className="love-btn inline-flex h-12 items-center justify-center rounded-full px-7 text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
          whileHover={reduced ? undefined : { scale: 1.04 }}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          style={{ minWidth: 200 }}
          aria-label="Open my surprise"
        >
          Open My Surprise 💕
        </motion.button>
      </motion.div>
    </motion.section>
  );
}

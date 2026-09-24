"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { useReducedMotion } from "./ReducedMotionGate";

export interface StorySectionProps {
  creatorName: string;
  partnerName: string;
  relationship: string | null;
  intro: string | null;
  story: string;
  specialMessage: string | null;
  /** Emotion accent (hex) used to tint the divider + special-message border. */
  accent: string;
}

/**
 * "A Little Something For You 💌" — the creator's message, revealed
 * progressively inside a premium glass card.
 *
 * The story field is split on `\n\n` into paragraphs; each paragraph fades in
 * (with a slight upward move + soft blur-to-clear) as it enters the viewport.
 * The creator's exact words are never rewritten.
 */
export function StorySection({
  creatorName,
  partnerName,
  relationship,
  intro,
  story,
  specialMessage,
  accent,
}: StorySectionProps) {
  const { reduced } = useReducedMotion();

  const reveal: Variants = {
    hidden: {
      opacity: 0,
      y: 18,
      filter: reduced ? "none" : "blur(8px)",
    },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: reduced
        ? { duration: 0.18, ease: "easeOut" }
        : { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const paragraphs = React.useMemo(
    () => story.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean),
    [story]
  );

  return (
    <section
      aria-labelledby="story-heading"
      className="px-5 py-16 sm:py-20"
    >
      <div className="mx-auto w-full max-w-2xl">
        <motion.h2
          id="story-heading"
          className="love-section-title font-heading text-center font-bold"
          style={{ color: "var(--love-text)" }}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.6, ease: "easeOut" }}
        >
          A Little Something For You 💌
        </motion.h2>

        <motion.div
          aria-hidden="true"
          className="mx-auto mt-3 h-[3px] w-24 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
          initial={{ opacity: 0, scaleX: 0.6 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.7, ease: "easeOut" }}
        />

        <motion.article
          className="love-glass-strong mt-8 rounded-3xl p-6 sm:p-9"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.7, ease: "easeOut" }}
        >
          {/* intro / relationship line */}
          {(intro || relationship) && (
            <motion.p
              className="love-body mb-6 font-medium italic"
              style={{ color: "var(--love-text)" }}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-10% 0px" }}
            >
              {intro ? intro : null}
              {intro && relationship ? " " : null}
              {relationship ? `— ${relationship}` : null}
            </motion.p>
          )}

          {/* story paragraphs */}
          <div className="space-y-4">
            {paragraphs.map((para, i) => (
              <motion.p
                key={i}
                className="love-body"
                style={{ color: "var(--love-text)" }}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-10% 0px" }}
              >
                {para}
              </motion.p>
            ))}
          </div>

          {/* special message */}
          {specialMessage && (
            <motion.blockquote
              className="mt-8 rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.45)",
                border: `1px solid ${accent}33`,
                boxShadow: `0 10px 30px ${accent}1a`,
              }}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-10% 0px" }}
            >
              <span
                aria-hidden="true"
                className="mb-2 block text-2xl leading-none"
                style={{ color: accent }}
              >
                “
              </span>
              <p
                className="love-body font-medium"
                style={{ color: "var(--love-text)" }}
              >
                {specialMessage}
              </p>
            </motion.blockquote>
          )}

          {/* signature line inside card (creator name) */}
          <motion.p
            className="mt-8 text-right text-sm font-semibold uppercase tracking-wider"
            style={{ color: "var(--love-muted)" }}
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
          >
            — {creatorName}
            {partnerName ? `, to ${partnerName}` : ""}
          </motion.p>
        </motion.article>
      </div>
    </section>
  );
}

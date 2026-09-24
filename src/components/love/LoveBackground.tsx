"use client";

import * as React from "react";
import { Particle, type ParticleKind } from "./anim/Particle";
import { useReducedMotion } from "./ReducedMotionGate";

export interface LoveBackgroundTheme {
  bgGradient: string;
  accent: string;
  accentSoft: string;
  particle: ParticleKind;
  finalGradient: string;
}

interface GlowSpec {
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
}

interface ParticleSpec {
  left: number;
  bottom: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function buildParticles(count: number): ParticleSpec[] {
  return Array.from({ length: count }, () => ({
    left: rand(0, 100),
    bottom: rand(-5, 95),
    size: Math.round(rand(10, 22)),
    duration: rand(9, 20),
    delay: rand(-20, 0),
    drift: rand(-40, 40),
    opacity: rand(0.35, 0.7),
  }));
}

function buildGlows(count: number): GlowSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    top: `${rand(8, 80)}%`,
    left: `${rand(5, 85)}%`,
    size: Math.round(rand(220, 420)),
    duration: rand(3, 5),
    delay: i * 0.8,
  }));
}

/**
 * Emotion-themed animated background. Renders:
 *  - the emotion's `bgGradient` (slowly panning via `.love-pan`)
 *  - 2–3 soft blurred glows tinted with the emotion's accent
 *  - a capped number of floating particles whose kind matches the emotion
 *    (hearts / sparkles / stars / petals / confetti)
 *
 * Performance: animates `transform` and `opacity` only. Particle counts are
 * capped (≤20 mobile / ≤40 desktop) and disabled entirely under
 * `prefers-reduced-motion`.
 */
export function LoveBackground({ theme }: { theme: LoveBackgroundTheme }) {
  const { reduced } = useReducedMotion();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    // Legacy fallback for older browsers (Safari < 14, old iOS).
    const legacy = mq as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };
    legacy.addListener?.(update);
    return () => legacy.removeListener?.(update);
  }, []);

  // Pick particle counts based on viewport + particle kind.
  const { particleCount, glowCount } = React.useMemo(() => {
    const kind = theme.particle;
    let pCount: number;
    if (kind === "sparkle") {
      pCount = isMobile ? 14 : 25;
    } else {
      // hearts / stars / petals / confetti
      pCount = isMobile ? 20 : 38;
    }
    const gCount = isMobile ? 2 : 3;
    return { particleCount: pCount, glowCount: gCount };
  }, [theme.particle, isMobile]);

  const particles = React.useMemo(
    () => buildParticles(particleCount),
    [particleCount]
  );
  const glows = React.useMemo(() => buildGlows(glowCount), [glowCount]);

  const showParticles = !reduced;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* base emotion gradient with slow pan */}
      <div
        className={reduced ? "absolute inset-0" : "absolute inset-0 love-pan"}
        style={{ backgroundImage: theme.bgGradient }}
      />

      {/* soft blurred glows tinted by the emotion accent */}
      {glows.map((g, i) => (
        <div
          key={`glow-${i}`}
          className={reduced ? "absolute" : "absolute love-glow-pulse"}
          style={{
            top: g.top,
            left: g.left,
            width: g.size,
            height: g.size,
            transform: "translate(-50%, -50%)",
            borderRadius: "9999px",
            background: `radial-gradient(circle at center, ${theme.accentSoft} 0%, rgba(0,0,0,0) 65%)`,
            filter: "blur(28px)",
            animationDuration: `${g.duration}s`,
            animationDelay: `${g.delay}s`,
          }}
        />
      ))}

      {/* floating particles */}
      {showParticles &&
        particles.map((p, i) => (
          <div
            key={`p-${i}`}
            className="absolute"
            style={{
              left: `${p.left}%`,
              bottom: `${p.bottom}%`,
              width: p.size,
              height: p.size,
              animation: `love-float ${p.duration}s linear ${p.delay}s infinite`,
              // CSS vars consumed by the keyframe
              ["--love-particle-opacity" as string]: p.opacity,
              ["--love-particle-drift" as string]: `${p.drift}px`,
            }}
          >
            <Particle
              kind={theme.particle}
              size={p.size}
              color={theme.accent}
              opacity={1}
            />
          </div>
        ))}
    </div>
  );
}

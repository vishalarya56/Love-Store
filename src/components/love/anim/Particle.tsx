"use client";

import * as React from "react";
import { HeartIcon } from "./HeartIcon";
import { Sparkle, Star, Petal, Confetti } from "./Sparkle";

export type ParticleKind =
  | "heart"
  | "sparkle"
  | "star"
  | "petal"
  | "confetti";

export interface ParticleProps {
  kind: ParticleKind;
  /** Pixel size (square). */
  size: number;
  /** CSS color (hex / rgb). */
  color: string;
  /** Opacity 0..1. */
  opacity?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A single rendered particle (heart / sparkle / star / petal / confetti).
 * Sized in px and tinted by `color`. Purely presentational.
 */
export function Particle({
  kind,
  size,
  color,
  opacity = 1,
  className,
  style,
}: ParticleProps) {
  const shared = {
    width: size,
    height: size,
    color,
    style: { opacity, display: "block", ...style },
    className,
  } as const;

  switch (kind) {
    case "heart":
      return <HeartIcon {...shared} />;
    case "sparkle":
      return <Sparkle {...shared} />;
    case "star":
      return <Star {...shared} />;
    case "petal":
      return <Petal {...shared} />;
    case "confetti":
      return <Confetti {...shared} />;
    default:
      return null;
  }
}

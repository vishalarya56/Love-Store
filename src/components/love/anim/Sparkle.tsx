"use client";

import * as React from "react";

type SparkleProps = React.SVGProps<SVGSVGElement>;

/** A 4-point sparkle / shine icon. */
export function Sparkle({ ...props }: SparkleProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M12 0c.6 4.7 2.7 6.8 7.4 7.4-4.7.6-6.8 2.7-7.4 7.4-.6-4.7-2.7-6.8-7.4-7.4C9.3 6.8 11.4 4.7 12 0z"
        fill="currentColor"
      />
      <circle cx="19.5" cy="19.5" r="2" fill="currentColor" />
      <circle cx="4" cy="18" r="1.4" fill="currentColor" />
    </svg>
  );
}

type StarProps = React.SVGProps<SVGSVGElement>;

/** A 5-point star (for long_distance night sky). */
export function Star({ ...props }: StarProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M12 1.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.6 5.8 20.4l1.6-7L2 8.8l7.1-.7L12 1.5z"
        fill="currentColor"
      />
    </svg>
  );
}

type PetalProps = React.SVGProps<SVGSVGElement>;

/** A soft petal shape (for cute_sweet pastel theme). */
export function Petal({ ...props }: PetalProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M12 1c3.2 2.2 5.6 5.4 6.3 9.5.5 3-.4 6.2-2.3 8.5-1.4 1.7-3 3-4 4-1-1-2.6-2.3-4-4C6.1 16.7 5.2 13.5 5.7 10.5 6.4 6.4 8.8 3.2 12 1z"
        fill="currentColor"
      />
    </svg>
  );
}

type ConfettiProps = React.SVGProps<SVGSVGElement>;

/** A small confetti rectangle (for birthday). */
export function Confetti({ ...props }: ConfettiProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="6" y="2" width="4" height="10" rx="1.5" fill="currentColor" transform="rotate(-15 8 7)" />
      <rect x="13" y="6" width="4" height="8" rx="1.5" fill="currentColor" transform="rotate(20 15 10)" />
      <circle cx="4" cy="16" r="2" fill="currentColor" />
      <circle cx="18" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

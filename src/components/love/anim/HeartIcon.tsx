"use client";

import * as React from "react";

export interface HeartIconProps extends React.SVGProps<SVGSVGElement> {
  /** When true, the heart is filled with currentColor. */
  filled?: boolean;
}

/**
 * Inline SVG heart used throughout the LoveStory recipient experience.
 * Uses `currentColor` so it can be tinted by the parent emotion theme.
 */
export const HeartIcon = React.forwardRef<SVGSVGElement, HeartIconProps>(
  function HeartIcon({ filled = true, ...props }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 32 29.6"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        <path
          d="M23.6,0c-3.4,0-6.3,2.2-7.6,5.4C14.7,2.2,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4 c0,9.4,16,21.2,16,21.2S32,17.8,32,8.4C32,3.8,28.2,0,23.6,0z"
          fill={filled ? "currentColor" : "none"}
          stroke={filled ? "none" : "currentColor"}
          strokeWidth={filled ? 0 : 2}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

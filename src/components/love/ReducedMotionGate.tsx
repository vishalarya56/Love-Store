"use client";

import * as React from "react";

interface ReducedMotionContextValue {
  reduced: boolean;
  /** True until the matchMedia probe has run on the client. */
  ready: boolean;
}

const ReducedMotionContext = React.createContext<ReducedMotionContextValue>({
  reduced: false,
  ready: false,
});

/**
 * Detects the user's `prefers-reduced-motion` setting and exposes it through
 * context. Heavy particle systems, parallax, heartbeat and large scale
 * animations should be gated on `reduced === true`.
 *
 * The CSS classes `.love-heartbeat`, `.love-glow-pulse` and `.love-pan` are
 * already disabled under reduced-motion in globals.css, but JS-driven
 * effects need explicit gating via this hook.
 */
export function ReducedMotionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reduced, setReduced] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(mq.matches);
      setReady(true);
    };
    update();
    // Modern browsers: change event. Safari < 14: legacy addListener.
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    const legacy = mq as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };
    legacy.addListener?.(update);
    return () => legacy.removeListener?.(update);
  }, []);

  const value = React.useMemo<ReducedMotionContextValue>(
    () => ({ reduced, ready }),
    [reduced, ready]
  );

  return (
    <ReducedMotionContext.Provider value={value}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotion(): ReducedMotionContextValue {
  return React.useContext(ReducedMotionContext);
}

/**
 * Synchronous probe used outside of React tree (rarely needed).
 * Returns false during SSR.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

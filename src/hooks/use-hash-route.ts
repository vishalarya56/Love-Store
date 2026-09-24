"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Hash-based client router. Because only the `/` route is exposed in this
 * sandbox, all LoveStory views live under hash routes:
 *   #/            -> landing
 *   #/create      -> creator flow
 *   #/create/:id  -> creator flow editing a draft
 *   #/dashboard   -> dashboard
 *   #/love/:slug  -> recipient experience
 */
export interface Route {
  name: "landing" | "create" | "dashboard" | "love" | "notfound";
  params: Record<string, string>;
}

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, "");
  const path = clean.startsWith("/") ? clean : `/${clean}`;
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "landing", params: {} };
  if (parts[0] === "create") {
    if (parts.length >= 2) return { name: "create", params: { draftId: parts[1]! } };
    return { name: "create", params: {} };
  }
  if (parts[0] === "dashboard") return { name: "dashboard", params: {} };
  if (parts[0] === "love" && parts.length >= 2) {
    return { name: "love", params: { slug: parts[1]! } };
  }
  return { name: "notfound", params: {} };
}

export function navigate(path: string) {
  if (typeof window === "undefined") return;
  const target = path.startsWith("#") ? path : `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash === target) {
    // force re-trigger
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = target;
  }
  // scroll to top on navigate
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined"
      ? { name: "landing", params: {} }
      : parseHash(window.location.hash)
  );
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    // initial
    onChange();
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function useNavigate() {
  return useCallback((path: string) => navigate(path), []);
}

"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * prefers-reduced-motion. Pass serverSnapshot=null when the caller needs a
 * distinct SSR/"checking" state (e.g. OpeningIntro).
 */
export function useReducedMotion(
  serverSnapshot: boolean | null = false,
): boolean | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

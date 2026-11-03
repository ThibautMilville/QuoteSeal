"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotion() {
  return false;
}

type Options = {
  examples: readonly string[];
  /** Pause the cycle (user typed, field focused with content, or busy). */
  active: boolean;
  typeMs?: number;
  eraseMs?: number;
  holdMs?: number;
  gapMs?: number;
};

/**
 * Cycles example strings with type / hold / erase. Returns "" when inactive
 * so a real value or reduced-motion static placeholder can take over.
 */
export function useTypewriterPlaceholder({
  examples,
  active,
  typeMs = 28,
  eraseMs = 16,
  holdMs = 2200,
  gapMs = 480,
}: Options): string {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );
  const [text, setText] = useState("");

  useEffect(() => {
    if (!active || reducedMotion || examples.length === 0) {
      setText("");
      return;
    }

    let cancelled = false;
    let timer = 0;
    let exampleIndex = 0;
    let charIndex = 0;
    let phase: "type" | "hold" | "erase" | "gap" = "type";

    const tick = () => {
      if (cancelled) return;
      const full = examples[exampleIndex % examples.length] ?? "";

      if (phase === "type") {
        charIndex = Math.min(full.length, charIndex + 1);
        setText(full.slice(0, charIndex));
        if (charIndex >= full.length) {
          phase = "hold";
          timer = window.setTimeout(tick, holdMs);
          return;
        }
        timer = window.setTimeout(tick, typeMs);
        return;
      }

      if (phase === "hold") {
        phase = "erase";
        timer = window.setTimeout(tick, eraseMs);
        return;
      }

      if (phase === "erase") {
        charIndex = Math.max(0, charIndex - 1);
        setText(full.slice(0, charIndex));
        if (charIndex <= 0) {
          phase = "gap";
          timer = window.setTimeout(tick, gapMs);
          return;
        }
        timer = window.setTimeout(tick, eraseMs);
        return;
      }

      // gap
      exampleIndex = (exampleIndex + 1) % examples.length;
      phase = "type";
      timer = window.setTimeout(tick, typeMs);
    };

    timer = window.setTimeout(tick, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, eraseMs, examples, gapMs, holdMs, reducedMotion, typeMs]);

  if (reducedMotion) return "";
  if (!active) return "";
  return text;
}

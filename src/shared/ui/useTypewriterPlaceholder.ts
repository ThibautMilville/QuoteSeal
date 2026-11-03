"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/shared/ui/useReducedMotion";

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
  const reducedMotion = useReducedMotion(false);
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

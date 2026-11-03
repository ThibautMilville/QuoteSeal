"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { mountIntroScene, type IntroSceneHandle } from "@/shared/ui/opening-intro-scene";
import { QuoteSealMark } from "@/shared/ui/QuoteSealMark";
import { useReducedMotion } from "@/shared/ui/useReducedMotion";

const INTRO_MS = 2400;
const EXIT_MS = 400;
const HARD_MAX_MS = 4500;
/** Matches `.qs-intro-name-text` sweep: 0.05s delay + 0.7s run */
const NAME_SWEEP_MS = 750;
const TAGLINE_DELAY_MS = 100;
const HOLD_MS = 320;

type Phase = "checking" | "playing" | "exiting" | "done";

function isLowPowerDevice(): boolean {
  if (typeof window === "undefined") return true;
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const lowCpu =
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4;
  const saveData =
    typeof navigator !== "undefined" &&
    "connection" in navigator &&
    Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData,
    );
  return mobile || coarse || lowCpu || saveData;
}

/**
 * Single brand path: QuoteSealMark stamps, then name + brief tagline.
 * Light slate/teal atmosphere behind the SVG - never a competing 3D glyph.
 */
export function OpeningIntro({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion(null);
  const [playPhase, setPhase] = useState<Exclude<Phase, "checking">>("playing");
  const phase: Phase =
    reducedMotion === null ? "checking" : reducedMotion ? "done" : playPhase;
  const [markActive, setMarkActive] = useState(false);
  const [nameVisible, setNameVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<IntroSceneHandle | null>(null);
  const completedRef = useRef(false);

  const unlockScroll = useCallback(() => {
    document.documentElement.classList.remove("qs-intro-scroll-lock");
    document.body.classList.remove("qs-intro-active");
  }, []);

  const markChromeReady = useCallback(() => {
    document.documentElement.classList.add("qs-intro-chrome-ready");
  }, []);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    document.documentElement.classList.add("qs-intro-done");
    setPhase((current) => (current === "done" ? current : "exiting"));
  }, []);

  useEffect(() => {
    if (reducedMotion === null) return;
    if (reducedMotion) {
      completedRef.current = true;
      document.documentElement.classList.add("qs-intro-done");
      markChromeReady();
      unlockScroll();
      return;
    }
    if (!completedRef.current) {
      document.documentElement.classList.add("qs-intro-scroll-lock");
      document.body.classList.add("qs-intro-active");
    }
  }, [reducedMotion, unlockScroll, markChromeReady]);

  useEffect(() => {
    if (phase !== "done") return;
    unlockScroll();
    markChromeReady();
  }, [phase, unlockScroll, markChromeReady]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (document.querySelector("[data-qs-skip-intro]")) {
      complete();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    handleRef.current?.dispose();
    handleRef.current = null;
    setMarkActive(false);
    setNameVisible(false);
    setTaglineVisible(false);

    let cancelled = false;
    let stampTimer = 0;
    let taglineTimer = 0;
    let holdTimer = 0;
    const hardTimer = window.setTimeout(() => {
      if (!cancelled) complete();
    }, HARD_MAX_MS);

    // Same SVG mark from frame 0 - stamp motion is CSS, not a 3D mesh.
    stampTimer = window.setTimeout(() => {
      if (!cancelled) setMarkActive(true);
    }, 40);

    try {
      handleRef.current = mountIntroScene({
        canvas,
        durationMs: INTRO_MS,
        lowPower: isLowPowerDevice(),
        onReveal: () => {
          if (cancelled) return;
          setNameVisible(true);
          taglineTimer = window.setTimeout(() => {
            if (cancelled) return;
            setTaglineVisible(true);
            holdTimer = window.setTimeout(() => {
              if (!cancelled) complete();
            }, NAME_SWEEP_MS + HOLD_MS);
          }, TAGLINE_DELAY_MS);
        },
        onComplete: () => {},
      });
    } catch {
      complete();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(hardTimer);
      window.clearTimeout(stampTimer);
      window.clearTimeout(taglineTimer);
      window.clearTimeout(holdTimer);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [phase, complete]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = window.setTimeout(() => setPhase("done"), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "done" || phase === "checking") return;
    const blockScroll = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".qs-intro-skip, .qs-intro-overlay button")
      ) {
        return;
      }
      event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Esc") {
        event.preventDefault();
        complete();
      }
    };
    const opts: AddEventListenerOptions = { passive: false };
    window.addEventListener("wheel", blockScroll, opts);
    window.addEventListener("touchmove", blockScroll, opts);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", blockScroll, opts);
      window.removeEventListener("touchmove", blockScroll, opts);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phase, complete]);

  const showOverlay = phase === "playing" || phase === "exiting";

  return (
    <>
      {showOverlay ? (
        <div
          className={`qs-intro-overlay ${phase === "exiting" ? "is-exiting" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="QuoteSeal opening"
        >
          <canvas ref={canvasRef} className="qs-intro-canvas" />
          <div
            className={`qs-intro-mark ${markActive ? "is-stamping" : ""}`}
            aria-hidden
          >
            <QuoteSealMark
              className="qs-intro-mark-svg"
              title=""
              aria-hidden
            />
          </div>
          <div className="qs-intro-copy" aria-live="polite">
            <p
              className={`qs-intro-name ${nameVisible ? "is-visible" : ""}`}
              aria-hidden={!nameVisible}
            >
              <span className="qs-intro-name-text">QuoteSeal</span>
            </p>
            <p
              className={`qs-intro-tagline ${taglineVisible ? "is-visible" : ""}`}
              aria-hidden={!taglineVisible}
            >
              Sealed quote buys - any job, any city
            </p>
          </div>
          <button
            type="button"
            className="qs-intro-skip"
            onClick={complete}
            aria-label="Skip intro"
          >
            Skip
          </button>
        </div>
      ) : null}
      <div
        className={`qs-app-shell ${phase === "done" || phase === "exiting" ? "is-revealed" : ""}`}
      >
        {children}
      </div>
    </>
  );
}

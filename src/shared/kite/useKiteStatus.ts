"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KiteStatus } from "@/shared/kite/types";

export type KiteLoadState = "loading" | "ready" | "error";

type Options = {
  /** When true, re-poll every 4s (connect guide open). */
  pollWhile?: boolean;
};

/**
 * Live Passport identity from GET /api/kite/status.
 * Re-fetches on focus / visibility and optionally while a guide is open.
 */
export function useKiteStatus(options: Options = {}) {
  const { pollWhile = false } = options;
  const [state, setState] = useState<KiteLoadState>("loading");
  const [status, setStatus] = useState<KiteStatus | null>(null);
  const pollBusy = useRef(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (pollBusy.current) return;
    pollBusy.current = true;
    if (!opts?.silent) setState("loading");
    try {
      const res = await fetch("/api/kite/status", { cache: "no-store" });
      if (!res.ok) throw new Error("status failed");
      const data = (await res.json()) as KiteStatus;
      setStatus(data);
      setState("ready");
    } catch {
      setStatus(null);
      setState("error");
    } finally {
      pollBusy.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh({ silent: true });
    };
    const onFocus = () => void refresh({ silent: true });
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!pollWhile) return;
    const timer = window.setInterval(() => void refresh({ silent: true }), 4000);
    return () => window.clearInterval(timer);
  }, [pollWhile, refresh]);

  return { state, status, refresh };
}

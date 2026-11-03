"use client";

import { useCallback, useEffect, useState } from "react";
import type { KiteStatus } from "@/shared/kite/types";

type LoadState = "loading" | "ready" | "error";

type SessionCreateState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "ready"; approvalUrl: string | null; detail: string }
  | { kind: "fallback"; detail: string }
  | { kind: "error"; detail: string };

function shortId(id: string | null): string {
  if (!id) return "-";
  if (id.length <= 18) return id;
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}

function statusTone(status: KiteStatus | null): {
  label: string;
  className: string;
} {
  if (!status) {
    return {
      label: "Checking",
      className: "border-cyan-100/20 text-cyan-100/70",
    };
  }
  if (status.canCreateSession) {
    return {
      label: status.sessionActive ? "Session live" : "Passport connected",
      className: "border-emerald-300/35 bg-emerald-300/10 text-emerald-200",
    };
  }
  if (status.identitySource === "published" && status.agentId) {
    return {
      label: "Identity published",
      className: "border-cyan-200/30 bg-cyan-200/8 text-cyan-100",
    };
  }
  if (status.installed && status.loggedIn === false) {
    return {
      label: "Sign in required",
      className: "border-amber-200/30 bg-amber-200/8 text-amber-100",
    };
  }
  return {
    label: "Sealed rail",
    className: "border-cyan-100/20 text-cyan-100/75",
  };
}

export function PassportIdentity() {
  const [state, setState] = useState<LoadState>("loading");
  const [status, setStatus] = useState<KiteStatus | null>(null);
  const [session, setSession] = useState<SessionCreateState>({ kind: "idle" });

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/kite/status", { cache: "no-store" });
      if (!res.ok) throw new Error("status failed");
      const data = (await res.json()) as KiteStatus;
      setStatus(data);
      setState("ready");
    } catch {
      setStatus(null);
      setState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createSession = useCallback(async () => {
    if (!status?.canCreateSession) return;
    setSession({ kind: "creating" });
    try {
      const res = await fetch("/api/kite/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskSummary: "QuoteSeal sealed quote buys",
          maxAmountPerTx: 1,
          maxTotalAmount: 3,
          ttlHours: 2,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        approvalUrl?: string | null;
        error?: string;
        detail?: string;
        rail?: string;
      };
      if (!res.ok) {
        setSession({
          kind: "fallback",
          detail:
            "Passport session unavailable on this host - sealed spends continue under the local seal.",
        });
        return;
      }
      setSession({
        kind: "ready",
        approvalUrl: data.approvalUrl ?? null,
        detail: data.approvalUrl
          ? "Approve the Passport spending session with your passkey, then return here."
          : "Passport session request sent. If a passkey prompt appears in another window, approve it.",
      });
      void refresh();
    } catch {
      setSession({
        kind: "error",
        detail: "Could not reach Passport session create. Sealed rail still works.",
      });
    }
  }, [refresh, status?.canCreateSession]);

  const tone = statusTone(status);

  return (
    <div className="mt-5 rounded-xl border border-[rgba(117,217,231,0.14)] bg-white/[0.025] px-3.5 py-3.5 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(117,217,231,0.75)]">
            Passport identity
          </p>
          <h3 className="m-0 mt-1.5 text-[0.98rem] font-medium tracking-[-0.02em]">
            {status?.agentLabel || "QuoteSeal agent"}
          </h3>
          <p className="m-0 mt-1 font-mono text-[0.72rem] text-[var(--muted)]">
            {status?.agentId
              ? shortId(status.agentId)
              : state === "loading"
                ? "Reading identity…"
                : "No agent id on this host yet"}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.08em] ${tone.className}`}
        >
          {state === "loading" ? "Checking" : tone.label}
        </span>
      </div>

      <dl className="m-0 mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
          <dt className="m-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)]">
            Rail
          </dt>
          <dd className="m-0 mt-1 text-[0.8rem] text-[rgba(220,235,240,0.92)]">
            {status?.rail === "passport" ? "Passport" : "Sealed local"}
          </dd>
        </div>
        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
          <dt className="m-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)]">
            Account
          </dt>
          <dd className="m-0 mt-1 truncate text-[0.8rem] text-[rgba(220,235,240,0.92)]">
            {status?.userEmail ||
              (status?.identitySource === "published"
                ? "Published identity"
                : "Not signed in")}
          </dd>
        </div>
        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
          <dt className="m-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)]">
            Session
          </dt>
          <dd className="m-0 mt-1 truncate text-[0.8rem] text-[rgba(220,235,240,0.92)]">
            {status?.sessionActive
              ? shortId(status.sessionId)
              : status?.canCreateSession
                ? "Ready to seal"
                : "Uses local seal"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          className="qs-btn-secondary inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-[0.78rem] font-semibold touch-manipulation"
        >
          Refresh status
        </button>
        {status?.canCreateSession ? (
          <button
            type="button"
            onClick={() => void createSession()}
            disabled={session.kind === "creating"}
            className="qs-btn-primary inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-[0.78rem] font-semibold touch-manipulation disabled:opacity-60"
          >
            {session.kind === "creating"
              ? "Creating session…"
              : "Create Passport session"}
          </button>
        ) : (
          <a
            href={status?.connectUrl || "https://docs.gokite.ai"}
            target="_blank"
            rel="noreferrer"
            className="qs-btn-primary inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-[0.78rem] font-semibold touch-manipulation"
          >
            Connect Passport
          </a>
        )}
      </div>

      {session.kind === "ready" ||
      session.kind === "fallback" ||
      session.kind === "error" ? (
        <p className="m-0 mt-3 text-[0.78rem] leading-snug text-[var(--muted)]">
          {session.detail}
          {session.kind === "ready" && session.approvalUrl ? (
            <>
              {" "}
              <a
                href={session.approvalUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[rgba(117,217,231,0.95)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
              >
                Open passkey approval
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {state === "error" ? (
        <p className="m-0 mt-3 text-[0.78rem] leading-snug text-amber-100/90">
          Could not load identity status. Sealed spends still work in chat.
        </p>
      ) : null}
    </div>
  );
}

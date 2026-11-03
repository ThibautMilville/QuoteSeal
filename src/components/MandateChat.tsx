"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { DEFAULT_MANDATE_MESSAGE, type MandatePlan } from "@/shared/mandate/schema";
import type { RunEvent, RunResult } from "@/shared/run/execute";
import {
  describePlanForChat,
  formatUsdc,
  narrateRunForChat,
  tierLabel,
} from "@/shared/ui/chat-copy";
import { QS_HELP_HANDOFF } from "@/shared/help/fallback";
import { AssistantResponseSpinner } from "@/shared/ui/AssistantResponseSpinner";
import { QuoteSealMark } from "@/shared/ui/QuoteSealMark";
import { useTypewriterPlaceholder } from "@/shared/ui/useTypewriterPlaceholder";
import type { FlowOutcome, FlowPhase } from "@/components/FlowDiagram";

const SCENARIOS = [
  {
    id: "default",
    label: "Lyon · solar film · 1 USDC / quote",
    message: DEFAULT_MANDATE_MESSAGE,
  },
  {
    id: "tight",
    label: "Nantes · office paint · 0.5 USDC / quote",
    message:
      "Get 2 office painting quotes for 80 m2 in Nantes. Total budget 3 USDC. Max 0.5 USDC per quote. Valid for 2 hours.",
  },
  {
    id: "wide",
    label: "Paris · HVAC · 2 USDC / quote",
    message:
      "Get 3 HVAC install quotes for 120 m2 in Paris. Session budget 5 USDC. Max 2 USDC per quote. Valid for 2 hours.",
  },
] as const;

/** Rotating empty-input hints - diverse jobs and cities, not one demo locale. */
const PLACEHOLDER_EXAMPLES = [
  "40 m2 solar film in Lyon, 3 USDC total, 1 USDC max per quote",
  "Office painting in Nantes, 2 quotes, 3 USDC total, 0.5 USDC max each",
  "HVAC install in Paris, 5 USDC total, 2 USDC max per quote",
  "Window replacement in Lille, 3 quotes, 4 USDC total, 1 USDC max each",
] as const;

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  plan?: MandatePlan;
  run?: RunResult;
  paid?: Extract<RunEvent, { type: "quote_paid" }>[];
  error?: boolean;
};

const WELCOME =
  "Hi - tell me what quotes you need. Any job, any city: include the work, place, size, and your spending seal (total budget and max per quote).\n\nExample: “40 m2 solar film in Lyon, up to 3 quotes, 3 USDC total, 1 USDC max each.”";

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

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

type MandateChatProps = {
  onFlowChange?: (phase: FlowPhase, outcome: FlowOutcome | null) => void;
};

export function MandateChat({ onFlowChange }: MandateChatProps = {}) {
  const listId = useId();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: WELCOME },
  ]);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [plan, setPlan] = useState<MandatePlan | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"compile" | "run" | null>(null);
  const flowRef = useRef(onFlowChange);
  flowRef.current = onFlowChange;

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );

  /** Animate only while empty and unfocused so the real caret stays usable. */
  const animatePlaceholder =
    draft.length === 0 && busy === null && !focused && !reducedMotion;

  const typedPlaceholder = useTypewriterPlaceholder({
    examples: PLACEHOLDER_EXAMPLES,
    active: animatePlaceholder,
  });

  const staticPlaceholder = PLACEHOLDER_EXAMPLES[0];
  const nativePlaceholder =
    draft.length === 0 && (reducedMotion || focused || busy !== null)
      ? staticPlaceholder
      : "";

  const emitFlow = useCallback(
    (phase: FlowPhase, outcome: FlowOutcome | null = null) => {
      flowRef.current?.(phase, outcome);
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy, scrollToBottom]);

  useEffect(() => {
    const onHandoff = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      const message = detail?.message?.trim() ?? "";
      if (message) {
        setDraft(message);
        window.requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(message.length, message.length);
        });
      } else {
        inputRef.current?.focus();
      }
    };
    window.addEventListener(QS_HELP_HANDOFF, onHandoff);
    return () => window.removeEventListener(QS_HELP_HANDOFF, onHandoff);
  }, []);

  const push = useCallback((msg: Omit<ChatMessage, "id"> & { id?: string }) => {
    setMessages((prev) => [...prev, { ...msg, id: msg.id ?? uid(msg.role) }]);
  }, []);

  const compileMandate = useCallback(
    async (message: string) => {
      setBusy("compile");
      setPlan(null);
      setPendingPlanId(null);
      emitFlow("describe");
      try {
        const res = await fetch("/api/mandate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        if (!res.ok) {
          throw new Error("I could not prepare a sealed plan. Please try again.");
        }
        const data = (await res.json()) as MandatePlan;
        const id = uid("plan");
        setPlan(data);
        setPendingPlanId(id);
        emitFlow("seal");
        push({
          id,
          role: "assistant",
          text: describePlanForChat(data),
          plan: data,
        });
      } catch (e) {
        emitFlow("idle");
        push({
          role: "assistant",
          text:
            e instanceof Error
              ? e.message
              : "Something went wrong preparing your seal.",
          error: true,
        });
      } finally {
        setBusy(null);
      }
    },
    [emitFlow, push],
  );

  const approveAndRun = useCallback(async () => {
    if (!plan || busy) return;
    setBusy("run");
    emitFlow("buy");
    push({ role: "user", text: "Approve and buy quotes" });
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        throw new Error("The sealed buy could not finish. Please try again.");
      }
      const data = (await res.json()) as RunResult;
      const summary = narrateRunForChat(data);
      const blockedCount = data.events.filter((e) => e.type === "quote_blocked")
        .length;
      const raiseAsked = data.events.some((e) => e.type === "raise_ask");
      emitFlow("done", {
        paidCount: summary.paid.length,
        blockedCount,
        raiseAsked,
      });
      push({
        role: "assistant",
        text: summary.lines.join("\n"),
        run: data,
        paid: summary.paid,
      });
      setPlan(null);
      setPendingPlanId(null);
    } catch (e) {
      emitFlow("seal");
      push({
        role: "assistant",
        text:
          e instanceof Error ? e.message : "Something went wrong running the buy.",
        error: true,
      });
    } finally {
      setBusy(null);
    }
  }, [busy, emitFlow, plan, push]);

  const submitText = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || busy) return;
      setDraft("");
      setPlan(null);
      setPendingPlanId(null);
      push({ role: "user", text: message });
      await compileMandate(message);
    },
    [busy, compileMandate, push],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitText(draft);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitText(draft);
    }
  };

  const pendingPlan = plan;
  const showOverlayPlaceholder =
    animatePlaceholder && typedPlaceholder.length > 0;

  return (
    <section
      id="chat"
      aria-labelledby="chat-title"
      className="qs-section scroll-mt-28 flex min-h-[min(70vh,40rem)] flex-col overflow-hidden"
    >
      <div className="shrink-0 border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <p className="section-kicker m-0">Assistant</p>
        <h2
          id="chat-title"
          className="m-0 mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
        >
          Describe the quotes you need
        </h2>
        <p className="m-0 mt-1.5 max-w-prose text-[0.85rem] leading-snug text-[var(--muted)]">
          Any job, any city - I prepare a spending seal, you approve, then quotes
          are bought under that cap. Nothing above the seal goes through.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy !== null}
              onClick={() => void submitText(s.message)}
              className="qs-chip rounded-lg px-3 py-1.5 text-left text-[0.78rem] disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="qs-chat-log flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        id={listId}
      >
        {messages.map((msg) => (
          <article
            key={msg.id}
            className={`qs-chat-row ${msg.role === "user" ? "is-user" : "is-assistant"}`}
          >
            {msg.role === "assistant" ? (
              <QuoteSealMark className="mt-0.5 h-8 w-8 shrink-0" />
            ) : null}
            <div
              className={`qs-chat-bubble ${msg.role === "user" ? "is-user" : "is-assistant"} ${
                msg.error ? "is-error" : ""
              }`}
            >
              <p className="qs-chat-text whitespace-pre-wrap">{msg.text}</p>

              {msg.plan && pendingPlan && pendingPlanId === msg.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void approveAndRun()}
                    className={`qs-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                      busy === null ? "qs-seal-pulse" : ""
                    }`}
                  >
                    {busy === "run" ? "Buying…" : "Approve and buy"}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      setPlan(null);
                      setPendingPlanId(null);
                      emitFlow("idle");
                      push({
                        role: "assistant",
                        text: "No problem - send a new request whenever you are ready.",
                      });
                    }}
                    className="qs-btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    Edit request
                  </button>
                </div>
              ) : null}

              {msg.paid && msg.paid.length > 0 ? (
                <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {msg.paid.map((q) => {
                    const mark =
                      typeof q.quote.mark === "string" && q.quote.mark
                        ? q.quote.mark
                        : q.vendor.slice(0, 2).toUpperCase();
                    return (
                      <li
                        key={`${q.tier}-${q.vendor}`}
                        className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            aria-hidden
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[rgba(56,189,248,0.08)] font-mono text-[0.7rem] font-semibold tracking-wide text-[var(--accent)]"
                          >
                            {mark}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 text-[0.72rem] font-mono uppercase tracking-wider text-[var(--accent)]">
                              Paid · {tierLabel(q.tier)}
                            </p>
                            <h3 className="m-0 mt-1 text-sm font-semibold">
                              {q.vendor}
                            </h3>
                            <p className="m-0 mt-1 text-[0.8rem] leading-snug text-[var(--muted)]">
                              {String(q.quote.summary)}
                            </p>
                            <p className="m-0 mt-2 font-mono text-[0.68rem] text-[var(--foreground)]">
                              {String(q.quote.estimatedTotalEur)} EUR est. ·{" "}
                              {String(q.quote.leadDays)} days ·{" "}
                              {formatUsdc(q.amountUsdc)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </article>
        ))}

        {busy === "compile" ? (
          <article className="qs-chat-row is-assistant">
            <QuoteSealMark className="mt-0.5 h-8 w-8 shrink-0 opacity-70" />
            <div className="qs-chat-bubble is-assistant">
              <AssistantResponseSpinner label="Preparing your seal…" />
            </div>
          </article>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-[var(--line)] bg-[rgba(2,9,13,0.45)] px-3 py-3 sm:px-4"
      >
        <label className="sr-only" htmlFor="qs-chat-input">
          Describe your quote request - job, city, size, and budget
        </label>
        <div className="flex items-center gap-2">
          <div className="relative h-11 flex-1">
            <textarea
              id="qs-chat-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={1}
              disabled={busy !== null}
              placeholder={nativePlaceholder}
              aria-describedby="qs-chat-hint"
              className="relative z-0 box-border h-11 min-h-11 w-full resize-none overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm leading-snug outline-none transition-[border-color,box-shadow] placeholder:text-[rgba(138,163,173,0.55)] focus:border-[rgba(91,238,190,0.45)] focus:shadow-[0_0_0_3px_rgba(91,238,190,0.12)] disabled:opacity-60"
            />
            {showOverlayPlaceholder ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 flex items-center overflow-hidden rounded-xl px-3.5 text-sm leading-snug text-[rgba(138,163,173,0.55)]"
              >
                {typedPlaceholder}
                <span className="qs-placeholder-caret ml-px inline-block h-[1em] w-px translate-y-[0.12em] bg-[rgba(138,163,173,0.65)] align-baseline" />
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={busy !== null || !draft.trim()}
            className="qs-btn-primary grid h-11 w-11 shrink-0 place-items-center rounded-xl disabled:opacity-40"
            aria-label="Send"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
              <path
                d="M2.5 8 H12.5 M9 4.5 L12.5 8 L9 11.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <p
          id="qs-chat-hint"
          className="m-0 mt-2 font-mono text-[0.65rem] tracking-[0.06em] text-[var(--muted)]"
        >
          Enter to send · Shift+Enter for a new line · no real money in this demo
        </p>
      </form>
    </section>
  );
}

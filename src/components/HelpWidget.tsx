"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { answerHelp, QS_HELP_HANDOFF } from "@/shared/help/fallback";
import { QuoteSealMark } from "@/shared/ui/QuoteSealMark";

type HelpMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "agent"; text: string; handoff?: string };

const SUGGESTIONS = [
  "How does QuoteSeal work?",
  "What is a spending seal?",
  "Try the Boulogne demo",
] as const;

const TEASERS = [
  "Need a quick tip? Ask me about the seal.",
  "Curious how buy / block / raise works?",
] as const;

const TEASER_FIRST_DELAY_MS = 7000;
const TEASER_INTERVAL_MS = 32000;
const TEASER_VISIBLE_MS = 5500;
const TEASER_MAX_DISMISSALS = 2;
const TEASER_DISMISSED_KEY = "qs-help-teaser-dismissed";
const HELP_OPENED_KEY = "qs-help-opened";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Private mode: keep in-memory only.
  }
}

function teaserStopped(): boolean {
  return (
    readSession(HELP_OPENED_KEY) === "1" ||
    Number(readSession(TEASER_DISMISSED_KEY) ?? "0") >= TEASER_MAX_DISMISSALS
  );
}

function introChromeReady(): boolean {
  return document.documentElement.classList.contains("qs-intro-chrome-ready");
}

function handoffToMandate(message?: string) {
  window.dispatchEvent(
    new CustomEvent(QS_HELP_HANDOFF, { detail: { message: message ?? "" } }),
  );
  const chat = document.getElementById("chat");
  chat?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [teaser, setTeaser] = useState<string | null>(null);
  const [teaserVisible, setTeaserVisible] = useState(false);

  const panelId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const teaserHideTimer = useRef(0);
  const teaserCycleTimer = useRef(0);
  const teaserIndex = useRef(0);

  const clearTeaserTimers = useCallback(() => {
    window.clearTimeout(teaserHideTimer.current);
    window.clearTimeout(teaserCycleTimer.current);
  }, []);

  const showTeaser = useCallback(
    (text: string) => {
      if (teaserStopped() || !introChromeReady()) return;
      setTeaser(text);
      setTeaserVisible(true);
      window.clearTimeout(teaserHideTimer.current);
      teaserHideTimer.current = window.setTimeout(() => {
        setTeaserVisible(false);
      }, TEASER_VISIBLE_MS);
    },
    [],
  );

  const scheduleTeasers = useCallback(() => {
    clearTeaserTimers();
    if (teaserStopped()) return;

    const tick = () => {
      if (teaserStopped() || open) return;
      const text = TEASERS[teaserIndex.current % TEASERS.length];
      teaserIndex.current += 1;
      showTeaser(text);
      teaserCycleTimer.current = window.setTimeout(tick, TEASER_INTERVAL_MS);
    };

    teaserCycleTimer.current = window.setTimeout(tick, TEASER_FIRST_DELAY_MS);
  }, [clearTeaserTimers, open, showTeaser]);

  useEffect(() => {
    if (open) {
      clearTeaserTimers();
      setTeaserVisible(false);
      return;
    }
    if (!introChromeReady()) {
      const root = document.documentElement;
      const obs = new MutationObserver(() => {
        if (introChromeReady()) {
          obs.disconnect();
          scheduleTeasers();
        }
      });
      obs.observe(root, { attributes: true, attributeFilter: ["class"] });
      return () => obs.disconnect();
    }
    scheduleTeasers();
    return clearTeaserTimers;
  }, [open, scheduleTeasers, clearTeaserTimers]);

  const dismissTeaser = useCallback(() => {
    setTeaserVisible(false);
    const next = Number(readSession(TEASER_DISMISSED_KEY) ?? "0") + 1;
    writeSession(TEASER_DISMISSED_KEY, String(next));
    if (next >= TEASER_MAX_DISMISSALS) clearTeaserTimers();
  }, [clearTeaserTimers]);

  const closePanel = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const openPanel = useCallback(() => {
    writeSession(HELP_OPENED_KEY, "1");
    setTeaserVisible(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, pending, open]);

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const nodes = [
      ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ];
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const ask = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    setInput("");
    setMessages((prev) => [...prev, { id: uid("u"), role: "user", text }]);
    setPending(true);
    await new Promise((r) => window.setTimeout(r, 180));
    const reply = answerHelp(text);
    setMessages((prev) => [
      ...prev,
      {
        id: uid("a"),
        role: "agent",
        text: reply.text,
        handoff: reply.handoff,
      },
    ]);
    setPending(false);
    if (reply.handoff !== undefined && reply.handoff.length > 0) {
      // Quote-job handoff: close FAB and fill main chat.
      window.setTimeout(() => {
        closePanel();
        handoffToMandate(reply.handoff);
      }, 450);
    }
  }, [pending, closePanel]);

  return (
    <div className="qs-agent-root">
      <div
        className={`qs-agent-backdrop ${open ? "is-open" : ""}`}
        onClick={closePanel}
        aria-hidden
      />

      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open}
        onKeyDown={onPanelKeyDown}
        className={`qs-agent-panel overflow-hidden rounded-2xl border border-emerald-200/25 bg-[#06171e] shadow-[0_24px_60px_rgba(0,0,0,0.5)] ${open ? "is-open" : ""}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-emerald-200/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <QuoteSealMark className="h-8 w-8 shrink-0" title="" aria-hidden />
            <div className="min-w-0">
              <h2
                id={titleId}
                className="m-0 text-base font-semibold tracking-[-0.02em] text-[#f5fbfd]"
              >
                Ask QuoteSeal
              </h2>
              <p className="m-0 mt-0.5 truncate text-[0.72rem] text-slate-500">
                Product help - seal, buy, block, raise
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close help"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div
          ref={listRef}
          className="qs-agent-messages space-y-2.5 px-4 py-3"
          aria-live="polite"
        >
          <div className="mr-auto max-w-[95%] rounded-xl bg-white/[0.04] px-3 py-2 text-sm leading-snug text-slate-300">
            Ask how QuoteSeal works, what a spending seal is, or how to try the
            demo. For a quote job, I send you to the main assistant above.
          </div>

          {messages.map((msg) =>
            msg.role === "user" ? (
              <div
                key={msg.id}
                className="ml-auto w-fit max-w-[90%] break-words rounded-xl bg-emerald-200/[0.1] px-3 py-2 text-sm leading-snug text-emerald-50"
              >
                {msg.text}
              </div>
            ) : (
              <div
                key={msg.id}
                className="mr-auto max-w-[95%] break-words rounded-xl bg-white/[0.04] px-3 py-2 text-sm leading-snug text-slate-300"
              >
                <p className="m-0 whitespace-pre-wrap">{msg.text}</p>
                {msg.handoff !== undefined ? (
                  <button
                    type="button"
                    onClick={() => {
                      closePanel();
                      handoffToMandate(msg.handoff);
                    }}
                    className="mt-2 inline-flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-emerald-200/30 bg-emerald-200/[0.1] px-3 py-1.5 text-left text-[0.76rem] text-emerald-100 transition-[filter] hover:brightness-110"
                  >
                    Open main assistant
                  </button>
                ) : null}
              </div>
            ),
          )}

          {pending ? (
            <p className="m-0 font-mono text-[0.7rem] text-cyan-200/70">
              Thinking…
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-emerald-200/10 px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (suggestion.includes("Boulogne")) {
                    void ask(
                      "40 m2 solar film in Boulogne, 3 quotes, 3 USDC total, 1 USDC max each",
                    );
                  } else {
                    void ask(suggestion);
                  }
                }}
                className="min-h-8 max-w-full cursor-pointer break-words rounded-full border border-emerald-200/15 bg-white/[0.03] px-2.5 py-1 text-[0.72rem] text-slate-300 transition-[border-color,color] hover:border-emerald-200/30 hover:text-white disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(input);
            }}
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  if (!pending && input.trim()) void ask(input);
                }
              }}
              maxLength={400}
              placeholder="Ask a question, or describe a quote job…"
              aria-label="Ask QuoteSeal"
              className="min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-emerald-200/15 bg-black/25 px-3 py-2 text-sm leading-snug text-[#f5fbfd] outline-none transition-[border-color] placeholder:text-slate-600 focus:border-emerald-200/35"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-emerald-200/30 bg-emerald-200/[0.12] px-3.5 text-[0.8rem] font-medium text-emerald-100 transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {teaser && !open ? (
        <div
          className={`qs-agent-teaser ${teaserVisible ? "is-visible" : ""}`}
          role="status"
        >
          <button
            type="button"
            className="qs-agent-teaser-body"
            onClick={() => openPanel()}
          >
            {teaser}
          </button>
          <button
            type="button"
            className="qs-agent-teaser-close"
            onClick={dismissTeaser}
            aria-label="Dismiss hint"
          >
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M3 3 L9 9 M9 3 L3 9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        onClick={open ? closePanel : () => openPanel()}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close Ask QuoteSeal" : "Ask QuoteSeal"}
        title="Ask QuoteSeal"
        className={`qs-agent-launcher ${open ? "is-open" : ""}`}
      >
        <span className="qs-agent-launcher-ring" aria-hidden />
        <span className="qs-agent-launcher-icon" aria-hidden>
          <QuoteSealMark className="qs-agent-launcher-mark" title="" />
          <svg className="qs-agent-launcher-close" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 5 L15 15 M15 5 L5 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
    </div>
  );
}

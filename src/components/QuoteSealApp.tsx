"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FlowDiagram,
  type FlowOutcome,
  type FlowPhase,
} from "@/components/FlowDiagram";
import { MandateChat } from "@/components/MandateChat";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandGlowTitle } from "@/shared/ui/GlowTitle";
import { QuoteSealMark } from "@/shared/ui/QuoteSealMark";
import { SiteHeader, type SiteHeaderStatus } from "@/shared/ui/SiteHeader";

const NAV_LINKS = [
  { href: "#chat", label: "Assistant" },
  { href: "#how", label: "How it works" },
  { href: "#flow", label: "Flow" },
  { href: "#developers", label: "For developers" },
] as const;

const HOW_STEPS = [
  {
    n: "01",
    tag: "Describe",
    title: "Describe the job",
    body: "Tell the assistant what quotes you need - job, city, size, and your spending limits.",
  },
  {
    n: "02",
    tag: "Seal",
    title: "Approve the seal",
    body: "Review the plain-English spending seal. Nothing is spent until you approve.",
  },
  {
    n: "03",
    tag: "Buy",
    title: "Quotes under the cap",
    body: "Approved quotes pay. Anything above the seal is blocked - you may need a new approval to raise the limit.",
  },
] as const;

export function QuoteSealApp() {
  const [status, setStatus] = useState<SiteHeaderStatus>({
    tone: "pending",
    label: "Checking…",
  });
  const [devOpen, setDevOpen] = useState(true);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("idle");
  const [flowOutcome, setFlowOutcome] = useState<FlowOutcome | null>(null);

  const onFlowChange = useCallback(
    (phase: FlowPhase, outcome: FlowOutcome | null) => {
      setFlowPhase(phase);
      setFlowOutcome(outcome);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) throw new Error("health failed");
        const data = (await res.json()) as { ok?: boolean };
        if (cancelled) return;
        if (data.ok) {
          setStatus({ tone: "ok", label: "Ready" });
        } else {
          setStatus({ tone: "warn", label: "Limited" });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus({ tone: "warn", label: "Offline" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden" id="top">
      <SiteHeader
        links={[...NAV_LINKS]}
        status={status}
        ctaHref="#chat"
        ctaLabel="Start chatting"
        homeHref="#top"
      />

      <main className="qs-page-enter mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-5 px-3 pb-16 pt-24 sm:gap-6 sm:px-4 sm:pt-28 md:px-6">
        <header className="relative min-w-0">
          <p className="section-kicker m-0">Sealed quote buys</p>
          <div className="mt-3 flex min-w-0 items-center gap-3 sm:gap-4">
            <QuoteSealMark className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" />
            <h1 className="m-0 min-w-0 text-[clamp(1.85rem,7vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
              <BrandGlowTitle lead="Quote" accent="Seal" />
            </h1>
          </div>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-snug text-[var(--muted)] sm:text-[1.02rem]">
            Tell the assistant what you need. Approve a spending seal. Quotes
            within the cap are paid - anything above is blocked. No real money
            moves in this demo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="#chat"
              className="qs-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Start chatting
            </a>
            <a
              href="#flow"
              className="qs-btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              See the flow
            </a>
          </div>
        </header>

        <MandateChat onFlowChange={onFlowChange} />

        <section
          id="how"
          aria-labelledby="how-title"
          className="qs-section scroll-mt-28"
        >
          <p className="section-kicker m-0">How it works</p>
          <h2
            id="how-title"
            className="m-0 mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
          >
            From a sentence to sealed quote buys
          </h2>
          <p className="m-0 mt-1.5 max-w-prose text-[0.85rem] leading-snug text-[var(--muted)]">
            One clear job: describe, approve, buy under the seal.
          </p>
          <ol className="qs-step-stagger m-0 mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
            {HOW_STEPS.map((step) => (
              <li
                key={step.n}
                className="relative flex flex-col rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5 transition-colors duration-200 hover:border-[rgba(91,238,190,0.28)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[rgba(91,238,190,0.3)] bg-[rgba(91,238,190,0.08)] font-mono text-[0.72rem] font-semibold text-[var(--accent)]">
                    {step.n}
                  </span>
                  <span className="truncate rounded border border-[rgba(117,217,231,0.2)] px-1.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-[rgba(117,217,231,0.8)]">
                    {step.tag}
                  </span>
                </div>
                <h3 className="m-0 mt-3 text-[0.98rem] font-medium tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="flow"
          aria-labelledby="flow-title"
          className="qs-section scroll-mt-28"
        >
          <p className="section-kicker m-0">Product flow</p>
          <h2
            id="flow-title"
            className="m-0 mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
          >
            Describe - Seal - Buy / Block / Raise
          </h2>
          <p className="m-0 mt-1.5 max-w-prose text-[0.85rem] leading-snug text-[var(--muted)]">
            The live diagram tracks your chat: allowed quotes pay, overspend is
            blocked, and raising the seal always needs a new approval.
          </p>
          <div className="mt-5">
            <FlowDiagram
              embedded
              phase={flowPhase}
              outcome={flowOutcome}
              title="Sealed agent spending"
            />
          </div>
        </section>

        <section
          id="developers"
          aria-labelledby="developers-title"
          className="qs-section scroll-mt-28"
        >
          <p className="section-kicker m-0">For developers</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="developers-title"
                className="m-0 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
              >
                Agent and API notes
              </h2>
              <p className="m-0 mt-1.5 max-w-prose text-[0.85rem] leading-snug text-[var(--muted)]">
                Optional detail for integrators. End users can ignore this section.
              </p>
            </div>
            <button
              type="button"
              className="qs-btn-secondary rounded-xl px-3.5 py-2 text-sm font-semibold"
              aria-expanded={devOpen}
              onClick={() => setDevOpen((v) => !v)}
            >
              {devOpen ? "Hide details" : "Show details"}
            </button>
          </div>

          {devOpen ? (
            <div className="qs-panel-reveal mt-5 grid gap-3 sm:grid-cols-3">
              <article className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5">
                <h3 className="m-0 text-[0.98rem] font-medium tracking-[-0.02em] text-[var(--accent)]">
                  Intent compile
                </h3>
                <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                  POST /api/mandate turns natural language into a sealed plan.
                  Uses OpenServ when configured; otherwise a local parser.
                </p>
              </article>
              <article className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5">
                <h3 className="m-0 text-[0.98rem] font-medium tracking-[-0.02em] text-[var(--accent)]">
                  Sealed run
                </h3>
                <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                  POST /api/run approves the session and buys local x402 quote
                  fixtures under the seal. Overspend is refused at pay time.
                </p>
              </article>
              <article className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5">
                <h3 className="m-0 text-[0.98rem] font-medium tracking-[-0.02em] text-[var(--accent)]">
                  Kite Passport
                </h3>
                <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                  Health at /api/health. Live Passport rails are optional - this
                  demo stays zero-spend until you opt into sandbox.
                </p>
              </article>
            </div>
          ) : null}
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}

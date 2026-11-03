"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  FlowDiagram,
  type FlowOutcome,
  type FlowPhase,
} from "@/components/FlowDiagram";
import { FaqSection } from "@/components/FaqSection";
import { ForAgentsSection } from "@/components/ForAgentsSection";
import { HelpWidget } from "@/components/HelpWidget";
import { MandateChat } from "@/components/MandateChat";
import { SiteFooter } from "@/components/SiteFooter";
import {
  HEALTH_CURL,
  MANDATE_CURL,
  OPENAPI_PATH,
  QUOTESEAL_LIVE_BASE,
  RUN_CURL,
  X402_CURL,
} from "@/shared/agent/agent-api-docs";
import { BrandGlowTitle } from "@/shared/ui/GlowTitle";
import { QuoteSealMark } from "@/shared/ui/QuoteSealMark";
import { SiteHeader, type SiteHeaderStatus } from "@/shared/ui/SiteHeader";

const NAV_LINKS = [
  { href: "#chat", label: "Assistant" },
  { href: "#how", label: "How it works" },
  { href: "#flow", label: "Flow" },
  { href: "#kite", label: "Kite track" },
  { href: "#faq", label: "FAQ" },
  { href: "#developers", label: "For developers" },
  { href: "#agents", label: "Agents" },
] as const;

const HOW_STEPS = [
  {
    n: "01",
    tag: "Describe",
    title: "Describe the job",
    body: "Say what you need quotes for - any trade, city, size, and your spending limits.",
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
    body: "Allowed quotes pay. Anything above the seal is blocked - raising the limit always needs a new approval.",
  },
] as const;

export function QuoteSealApp() {
  const [status, setStatus] = useState<SiteHeaderStatus>({
    tone: "pending",
    label: "Checking…",
  });
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

      <main className="qs-page-enter mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-5 px-3 pb-28 pt-24 sm:gap-6 sm:px-4 sm:pb-24 sm:pt-28 md:px-6">
        <header className="relative min-w-0">
          <p className="section-kicker m-0">Sealed quote buys</p>
          <div className="mt-3 flex min-w-0 items-center gap-3 sm:gap-4">
            <QuoteSealMark className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" />
            <h1 className="m-0 min-w-0 text-[clamp(1.7rem,7.2vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
              <BrandGlowTitle lead="Quote" accent="Seal" />
            </h1>
          </div>
          <p className="mt-3 max-w-2xl text-[0.92rem] leading-snug text-[var(--muted)] sm:text-[1.02rem]">
            Any job, any city, any budget. Tell the assistant what quotes you
            need, approve a spending seal, and buys stay inside the cap -
            anything above is blocked. No real money moves in this demo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="#chat"
              className="qs-btn-primary inline-flex min-h-11 items-center rounded-xl px-4 py-2.5 text-sm font-semibold touch-manipulation"
            >
              Start chatting
            </a>
            <a
              href="#faq"
              className="qs-btn-secondary inline-flex min-h-11 items-center rounded-xl px-4 py-2.5 text-sm font-semibold touch-manipulation"
            >
              Read the FAQ
            </a>
          </div>
        </header>

        <MandateChat onFlowChange={onFlowChange} />

        <section
          id="how"
          aria-labelledby="how-title"
          className="qs-section relative scroll-mt-28 overflow-hidden"
        >
          {/* Soft brand atmosphere - dark teal, no clutter */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-40 opacity-[0.35] sm:h-48"
            aria-hidden
          >
            <Image
              src="/qs-atmosphere.jpg"
              alt=""
              fill
              sizes="(max-width: 1100px) 100vw, 1100px"
              className="object-cover object-[50%_35%] [mask-image:linear-gradient(180deg,#000_0%,transparent_100%)]"
              priority={false}
            />
          </div>
          <p className="section-kicker relative m-0">How it works</p>
          <h2
            id="how-title"
            className="relative m-0 mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
          >
            From a sentence to sealed quote buys
          </h2>
          <p className="relative m-0 mt-1.5 max-w-prose text-[0.85rem] leading-snug text-[var(--muted)]">
            One clear loop for any quote request: describe, approve, buy under
            the seal.
          </p>
          <ol className="qs-step-stagger relative m-0 mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
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
              title="Sealed spending flow"
            />
          </div>
        </section>

        <section
          id="kite"
          aria-labelledby="kite-title"
          className="qs-section scroll-mt-28"
        >
          <p className="section-kicker m-0">Kite track</p>
          <h2
            id="kite-title"
            className="m-0 mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
          >
            Built for the Kite track
          </h2>
          <p className="m-0 mt-1.5 max-w-prose text-[0.85rem] leading-snug text-[var(--muted)]">
            QuoteSeal maps the three Kite pillars honestly: what this{" "}
            <span className="font-mono text-[0.78rem] text-[rgba(200,220,228,0.85)]">
              demo_local
            </span>{" "}
            surface shows vs what Passport enables when you opt in.
          </p>
          <ol className="m-0 mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
            <li className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5">
              <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(117,217,231,0.75)]">
                01 · Identity
              </p>
              <h3 className="m-0 mt-2 text-[0.98rem] font-medium tracking-[-0.02em]">
                Verifiable agent identity
              </h3>
              <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                Kite Passport is the identity rail. This public demo does not
                require a live Passport login - health and{" "}
                <span className="font-mono text-[0.72rem]">/api/kite/*</span>{" "}
                report install state so you can wire sandbox later.
              </p>
            </li>
            <li className="rounded-xl border border-[rgba(91,238,190,0.15)] bg-[rgba(91,238,190,0.03)] px-3.5 py-3.5">
              <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(91,238,190,0.75)]">
                02 · Limits
              </p>
              <h3 className="m-0 mt-2 text-[0.98rem] font-medium tracking-[-0.02em]">
                User-defined permissions
              </h3>
              <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                Strong here: you set total budget and max per quote, approve the
                seal once, and pay-time code refuses anything above it. Raising
                always needs a new approval - never a silent escalate.
              </p>
            </li>
            <li className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5">
              <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(117,217,231,0.75)]">
                03 · Payments
              </p>
              <h3 className="m-0 mt-2 text-[0.98rem] font-medium tracking-[-0.02em]">
                Agentic pay for real tasks
              </h3>
              <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                Demo path uses local x402-shaped quote fixtures (buy / block /
                raise with zero real spend). Kite Passport is how agentic shop /
                book / pay can go live in sandbox - not claimed as live wallet
                spend on this page.
              </p>
            </li>
          </ol>
        </section>

        <section
          id="developers"
          aria-labelledby="developers-title"
          className="qs-section scroll-mt-28"
        >
          <p className="section-kicker m-0">For developers</p>
          <h2
            id="developers-title"
            className="m-0 mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
          >
            Agent and API notes
          </h2>
          <p className="m-0 mt-1.5 max-w-prose text-[0.85rem] leading-snug text-[var(--muted)]">
            Always-on integrator surface: curls, env names (no secrets), OpenAPI,
            and optional MCP. Product chat above stays jargon-free.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5">
              <h3 className="m-0 text-[0.98rem] font-medium tracking-[-0.02em] text-[var(--accent)]">
                Build a plan
              </h3>
              <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                POST /api/mandate turns a plain request into a sealed plan. Uses
                OpenServ when SERV_API_KEY is set; otherwise a local parser.
              </p>
            </article>
            <article className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5">
              <h3 className="m-0 text-[0.98rem] font-medium tracking-[-0.02em] text-[var(--accent)]">
                Sealed run
              </h3>
              <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                POST /api/run approves the session and buys sample local quotes
                under the seal. Overspend is refused at pay time.
              </p>
            </article>
            <article className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] px-3.5 py-3.5">
              <h3 className="m-0 text-[0.98rem] font-medium tracking-[-0.02em] text-[var(--accent)]">
                Health + fixtures
              </h3>
              <p className="m-0 mt-1.5 text-[0.8rem] leading-snug text-[var(--muted)]">
                GET /api/health and /api/x402/quote/{"{tier}"}. Kite Passport is
                optional - demo stays zero-spend unless you opt into sandbox.
              </p>
            </article>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href={OPENAPI_PATH}
              className="inline-flex min-h-9 items-center text-[0.8rem] font-medium text-[rgba(117,217,231,0.85)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              OpenAPI 3
            </a>
            <a
              href="#agents"
              className="inline-flex min-h-9 items-center text-[0.8rem] font-medium text-[rgba(117,217,231,0.85)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
            >
              Agents section
            </a>
            <p className="m-0 font-mono text-[0.68rem] text-[var(--muted)]">
              $BASE_URL = {QUOTESEAL_LIVE_BASE}
            </p>
          </div>

          <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
            <pre className="m-0 max-h-40 overflow-auto rounded-xl border border-[rgba(117,217,231,0.1)] bg-[#020b10]/70 p-2.5 font-mono text-[0.64rem] leading-relaxed text-[rgba(200,220,228,0.88)] whitespace-pre-wrap break-all sm:max-h-44 sm:p-3 sm:text-[0.68rem]">
              {HEALTH_CURL}
            </pre>
            <pre className="m-0 max-h-40 overflow-auto rounded-xl border border-[rgba(117,217,231,0.1)] bg-[#020b10]/70 p-2.5 font-mono text-[0.64rem] leading-relaxed text-[rgba(200,220,228,0.88)] whitespace-pre-wrap break-all sm:max-h-44 sm:p-3 sm:text-[0.68rem]">
              {MANDATE_CURL}
            </pre>
            <pre className="m-0 max-h-40 overflow-auto rounded-xl border border-[rgba(117,217,231,0.1)] bg-[#020b10]/70 p-2.5 font-mono text-[0.64rem] leading-relaxed text-[rgba(200,220,228,0.88)] whitespace-pre-wrap break-all sm:max-h-44 sm:p-3 sm:text-[0.68rem]">
              {RUN_CURL}
            </pre>
            <pre className="m-0 max-h-40 overflow-auto rounded-xl border border-[rgba(117,217,231,0.1)] bg-[#020b10]/70 p-2.5 font-mono text-[0.64rem] leading-relaxed text-[rgba(200,220,228,0.88)] whitespace-pre-wrap break-all sm:max-h-44 sm:p-3 sm:text-[0.68rem]">
              {X402_CURL}
            </pre>
          </div>
        </section>

        <ForAgentsSection />

        <FaqSection />

        <SiteFooter />
      </main>

      <HelpWidget flowPhase={flowPhase} />
    </div>
  );
}

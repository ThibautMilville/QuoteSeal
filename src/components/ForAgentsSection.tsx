"use client";

import { useState } from "react";
import {
  ENV_NOTES,
  HEALTH_CURL,
  MANDATE_CURL,
  MCP_CURSOR_CONFIG,
  OPENAPI_PATH,
  QUOTESEAL_LIVE_BASE,
  RUN_CURL,
  X402_CURL,
} from "@/shared/agent/agent-api-docs";

const linkBtn =
  "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-1 text-[0.8rem] font-medium text-[rgba(117,217,231,0.85)] underline-offset-2 touch-manipulation hover:text-[var(--accent)] hover:underline";

const copyBtn =
  "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(91,238,190,0.22)] bg-white/[0.03] px-2.5 py-1 font-mono text-[0.68rem] text-[rgba(91,238,190,0.9)] transition-colors touch-manipulation hover:border-[rgba(91,238,190,0.4)] hover:text-white";

function IconCopy({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect
        x="5.5"
        y="5.5"
        width="7.5"
        height="8"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M10.5 5.25 V4 A1.25 1.25 0 0 0 9.25 2.75 H4 A1.25 1.25 0 0 0 2.75 4 V9.25 A1.25 1.25 0 0 0 4 10.5 H5.25"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyBlock({
  title,
  subtitle,
  code,
  label,
}: {
  title: string;
  subtitle?: string;
  code: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {
        setCopied(false);
      });
  };

  return (
    <div className="rounded-xl border border-[rgba(117,217,231,0.1)] bg-white/[0.02] p-3 sm:p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[0.88rem] font-medium tracking-[-0.01em] text-[var(--foreground)]">
            {title}
          </p>
          {subtitle ? (
            <p className="m-0 mt-0.5 text-[0.72rem] text-[var(--muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={copyBtn}
          onClick={copy}
          aria-label={`Copy ${label}`}
        >
          <IconCopy className="h-3 w-3 shrink-0" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="m-0 mt-2.5 max-h-52 overflow-auto rounded-lg border border-white/6 bg-[#020b10]/70 p-2.5 font-mono text-[0.68rem] leading-relaxed text-[rgba(200,220,228,0.88)] whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

export function ForAgentsSection() {
  const liveOpenapi = `${QUOTESEAL_LIVE_BASE}${OPENAPI_PATH}`;

  return (
    <section
      id="agents"
      aria-labelledby="agents-title"
      className="qs-section scroll-mt-28"
    >
      <p className="section-kicker m-0">For agents</p>
      <h2
        id="agents-title"
        className="m-0 mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
      >
        Call QuoteSeal before you spend on quotes.
      </h2>
      <p className="m-0 mt-2 max-w-3xl text-[0.88rem] leading-relaxed text-[var(--muted)]">
        QuoteSeal is a{" "}
        <span className="text-[var(--foreground)]">sealed spending gate</span>{" "}
        for quote buys - not an open wallet. Other agents POST here to compile a
        plan, approve a seal, then buy only under the cap. Humans use the chat
        above; agents use the same REST surface (and optional MCP) to get
        buy / block / raise events without silent escalate. Default mode is{" "}
        <span className="font-mono text-[0.78rem]">demo_local</span> (fixture
        x402, no live Passport spend). See{" "}
        <a
          href="#kite"
          className="text-[rgba(117,217,231,0.85)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
        >
          Built for the Kite track
        </a>{" "}
        for identity / limits / payments mapping.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-[rgba(117,217,231,0.15)] bg-[rgba(117,217,231,0.03)] px-3.5 py-3">
          <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(117,217,231,0.75)]">
            Agents
          </p>
          <p className="m-0 mt-1.5 text-[0.82rem] leading-snug text-[rgba(220,235,240,0.9)]">
            Mandate → run → respect blocks. Never auto-raise the seal. Prefer{" "}
            <span className="font-mono text-[0.72rem] text-[var(--accent)]">
              npm run mcp
            </span>{" "}
            or OpenAPI curls with{" "}
            <span className="font-mono text-[0.72rem]">$BASE_URL</span>.
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(91,238,190,0.12)] bg-white/[0.02] px-3.5 py-3">
          <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(91,238,190,0.7)]">
            Humans
          </p>
          <p className="m-0 mt-1.5 text-[0.82rem] leading-snug text-[rgba(220,235,240,0.9)]">
            Describe → approve the seal → watch buy / block / raise in chat and
            the flow diagram. Same checks; the UI adds plain-English copy.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <a
          href={OPENAPI_PATH}
          className={linkBtn}
          target="_blank"
          rel="noreferrer"
        >
          OpenAPI 3 spec
        </a>
        <a
          href={liveOpenapi}
          className={linkBtn}
          target="_blank"
          rel="noreferrer"
        >
          Live: quoteseal.ozc.fr/openapi.yaml
        </a>
        <p className="m-0 font-mono text-[0.68rem] text-[var(--muted)]">
          Set <span className="text-[rgba(200,220,228,0.85)]">$BASE_URL</span> ={" "}
          <span className="text-[rgba(200,220,228,0.85)]">
            {QUOTESEAL_LIVE_BASE}
          </span>{" "}
          (or your host)
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-[rgba(245,198,94,0.15)] bg-[rgba(245,198,94,0.03)] px-3.5 py-2.5">
        <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(245,198,94,0.8)]">
          Env notes
        </p>
        <pre className="m-0 mt-1.5 whitespace-pre-wrap font-mono text-[0.72rem] leading-snug text-[var(--muted)]">
          {ENV_NOTES}
        </pre>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <CopyBlock
          title="curl: GET /api/health"
          subtitle="Replace $BASE_URL with your host"
          code={HEALTH_CURL}
          label="Health curl"
        />
        <CopyBlock
          title="curl: POST /api/mandate"
          subtitle="Free text → sealed plan"
          code={MANDATE_CURL}
          label="Mandate curl"
        />
        <CopyBlock
          title="curl: POST /api/run"
          subtitle="Approve plan → buy / block / raise"
          code={RUN_CURL}
          label="Run curl"
        />
        <CopyBlock
          title="curl: x402 quote fixtures"
          subtitle="/api/x402/quote/{cheap|standard|premium}"
          code={X402_CURL}
          label="x402 curl"
        />
      </div>

      <div className="mt-2.5">
        <CopyBlock
          title="Cursor MCP config"
          subtitle="npm run mcp · env QUOTESEAL_BASE_URL"
          code={MCP_CURSOR_CONFIG}
          label="MCP config"
        />
      </div>
    </section>
  );
}

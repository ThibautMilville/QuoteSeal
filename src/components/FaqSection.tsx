"use client";

import { useId, useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is QuoteSeal?",
    answer:
      "A sealed quote-buying demo for any job and any city. You describe the work, approve a hard spending seal (total budget and max per quote), then sample quotes are bought under that cap. Anything above the seal is blocked - raising the limit always needs a new approval.",
  },
  {
    question: "What is SERV Reasoning, and how is it different from the seal?",
    answer:
      "The seal is deterministic code: per-quote and total caps checked at pay time, never silently raised. SERV Reasoning (OpenServ) is optional judgment for turning free-text into a mandate plan and for raise-ask copy when a quote would exceed the seal. If SERV_API_KEY is unset, a local parser keeps demos reproducible. Rules stay in code; SERV does not override a block.",
  },
  {
    question: "Is this real money? What about Kite Passport?",
    answer:
      "This public demo spends zero real money. Quote fixtures are local x402 sample endpoints. Kite Passport is optional for hackathon / sandbox wiring - see health and the Agents section. Neither QuoteSeal nor SERV custodies funds or keys.",
  },
  {
    question: "How does Approve work?",
    answer:
      "After the assistant compiles your request into a plain-English seal, nothing is spent until you click Approve and buy. That creates a short-lived session with the same per-quote and total caps. Each subsequent buy is checked against that session at pay time.",
  },
  {
    question: "Why was a quote blocked?",
    answer:
      "A block means the quote price is above the per-quote seal, or paying it would exceed the total budget. QuoteSeal will not auto-raise. If a raise would help, the assistant can ask you to approve a new seal with higher limits - you stay in control.",
  },
  {
    question: "What jobs and cities are supported?",
    answer:
      "Any job, any city in the product copy. Merchant names and EUR heuristics resolve from the job type (solar film, paint, HVAC, or generic local trade). Seal USDC prices stay fixed so demos stay predictable: cheap 0.3, standard 0.8, premium 1.5.",
  },
  {
    question: "Can other agents call QuoteSeal?",
    answer:
      "Yes. See For developers (#developers) and For agents (#agents): OpenAPI at /openapi.yaml documents GET /api/health, POST /api/mandate, POST /api/run, and the x402 quote fixtures. Optional MCP: npm run mcp with QUOTESEAL_BASE_URL. No API auth today; treat this as a demo surface.",
  },
  {
    question: "What is the MCP / hackathon path?",
    answer:
      "Agents can compile a mandate, show the seal to a human, then run sealed buys. Prefer the live base URL https://quoteseal.ozc.fr. Use demo_local mode unless you explicitly opt into Kite sandbox. OpenAPI and the Agents section include ready-to-copy curls and Cursor MCP config.",
  },
  {
    question: "Where does the left tip bubble near the chat button come from?",
    answer:
      "The floating Ask QuoteSeal button occasionally shows a short tip to its left after the intro finishes. It pauses while you are typing in the main assistant on mobile, stops after you open help twice dismissed, and never spends money - it only opens product help.",
  },
  {
    question: "Is this financial or purchasing advice?",
    answer:
      "No. QuoteSeal is a spending-seal demo for quote buys under a hard cap, not a recommendation of vendors, prices, or contracts. Review every plan before you approve.",
  },
];

export function FaqSection() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="qs-section scroll-mt-28"
    >
      <p className="section-kicker m-0">FAQ</p>
      <h2
        id="faq-title"
        className="m-0 mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl"
      >
        Frequently asked questions
      </h2>
      <p className="m-0 mt-1.5 max-w-prose text-[0.85rem] leading-snug text-[var(--muted)]">
        Seal, SERV, demo money, agents, and hackathon wiring - short answers.
      </p>

      <ul className="m-0 mt-5 list-none divide-y divide-cyan-100/10 overflow-hidden rounded-xl border border-cyan-100/10 bg-white/[0.015] p-0">
        {FAQ_ITEMS.map((item, index) => {
          const open = openIndex === index;
          const buttonId = `${baseId}-q${index}`;
          const panelId = `${baseId}-a${index}`;
          return (
            <li key={item.question}>
              <h3 className="m-0">
                <button
                  id={buttonId}
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-3.5 py-3 text-left text-[0.9rem] font-medium tracking-[-0.01em] text-slate-200 transition-colors touch-manipulation hover:bg-white/[0.03] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-300/60 sm:px-4"
                >
                  <span>{item.question}</span>
                  <span
                    aria-hidden
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border font-mono text-sm transition-[transform,border-color,color] duration-300 motion-reduce:transition-none ${
                      open
                        ? "rotate-45 border-emerald-200/40 text-emerald-200"
                        : "border-cyan-100/15 text-cyan-200/70"
                    }`}
                  >
                    +
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                aria-hidden={!open}
                className={`how-it-works-collapse ${open ? "is-open" : ""}`}
              >
                <div className="how-it-works-collapse-inner">
                  <p className="m-0 px-3.5 pb-4 text-[0.84rem] leading-relaxed text-slate-400 sm:px-4">
                    {item.answer}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

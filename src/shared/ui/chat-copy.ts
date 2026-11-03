import type { MandatePlan } from "@/shared/mandate/schema";
import type { RunEvent, RunResult } from "@/shared/run/execute";
import {
  categoryLabel,
  resolveJobCategory,
  resolveQuoteOffer,
} from "@/shared/quotes/catalog";

const TIER_LABEL: Record<string, string> = {
  cheap: "Entry",
  standard: "Standard",
  premium: "Premium",
};

export function tierLabel(tier: string): string {
  return TIER_LABEL[tier] ?? tier;
}

export function formatUsdc(amount: number): string {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${fixed} USDC`;
}

/** Plain-English confirmation after /api/mandate. */
export function describePlanForChat(plan: MandatePlan): string {
  const { mandate, session, plan: steps } = plan;
  const category = resolveJobCategory(mandate.job);
  const trade = categoryLabel(category);
  const list = steps
    .map((step, i) => {
      const offer = resolveQuoteOffer(mandate.job, step.tier);
      return `${i + 1}. ${tierLabel(step.tier)} quote from ${offer.vendor} (~${formatUsdc(step.expectedPriceUsdc)})`;
    })
    .join("\n");

  return [
    `I can seal a buy for ${mandate.job} in ${mandate.city} (${mandate.areaM2} m2).`,
    ``,
    `Spending seal`,
    `- Up to ${formatUsdc(session.maxAmountPerTx)} per quote`,
    `- Up to ${formatUsdc(session.maxTotalAmount)} total`,
    `- Valid for ${session.ttlHours}h`,
    `- Up to ${mandate.maxQuotes} ${trade} quotes`,
    ``,
    `Planned buys`,
    list,
    ``,
    `Nothing is spent until you approve. Quotes above the seal are blocked automatically.`,
  ].join("\n");
}

function blockReason(code: string, message: string): string {
  if (code === "session_rule_exceeded") {
    return "price is above the per-quote seal";
  }
  if (code === "session_total_exceeded") {
    return "this buy would exceed the total budget";
  }
  if (code === "endpoint_not_allowed") {
    return "merchant is outside the sealed allow-list";
  }
  if (code === "session_expired") {
    return "the seal has expired";
  }
  // Never surface raw codes in the main product voice.
  return message.replace(/session_rule_exceeded|session_total_exceeded|demo_local|fallback/gi, "").trim() ||
    "the seal refused this payment";
}

export type ChatRunSummary = {
  lines: string[];
  paid: Extract<RunEvent, { type: "quote_paid" }>[];
  needsNewApproval: boolean;
  suggestedMaxPerTx: number | null;
};

/** Narrate /api/run results for the assistant bubble. */
export function narrateRunForChat(run: RunResult): ChatRunSummary {
  const lines: string[] = ["Approved - the seal is live. Buying quotes…", ""];
  let needsNewApproval = false;
  let suggestedMaxPerTx: number | null = null;
  const paid: Extract<RunEvent, { type: "quote_paid" }>[] = [];

  for (const event of run.events) {
    switch (event.type) {
      case "quote_paid":
        paid.push(event);
        lines.push(
          `Paid - ${event.vendor} (${tierLabel(event.tier)}) for ${formatUsdc(event.amountUsdc)}. Spent so far: ${formatUsdc(event.spentTotal)}.`,
        );
        break;
      case "quote_blocked":
        lines.push(
          `Blocked - ${tierLabel(event.tier)} quote (${blockReason(event.code, event.message)}).`,
        );
        break;
      case "raise_ask":
        needsNewApproval = true;
        suggestedMaxPerTx = event.suggestedMaxPerTx;
        lines.push(
          `Needs new approval - to unlock the next quote, raise the per-quote seal to about ${formatUsdc(event.suggestedMaxPerTx)}.`,
        );
        break;
      case "done":
        lines.push("");
        if (event.paidCount === 0 && event.blockedCount > 0) {
          lines.push(
            `Finished - no quotes paid. ${event.blockedCount} blocked. Spent ${formatUsdc(event.spentTotal)}.`,
          );
        } else {
          lines.push(
            `Finished - ${event.paidCount} paid, ${event.blockedCount} blocked. Spent ${formatUsdc(event.spentTotal)}.`,
          );
        }
        break;
      default:
        break;
    }
  }

  return { lines, paid, needsNewApproval, suggestedMaxPerTx };
}

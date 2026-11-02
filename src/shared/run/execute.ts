import type { MandatePlan } from "@/shared/mandate/schema";
import { QUOTE_CATALOG, quotePath } from "@/shared/quotes/catalog";
import { composeRaiseAsk } from "@/shared/serv/client";
import {
  authorizePayment,
  createSealedSession,
  recordPayment,
  type SealedSession,
} from "@/shared/session/store";

export type RunEvent =
  | {
      type: "session_approved";
      sessionId: string;
      mode: string;
      maxAmountPerTx: number;
      maxTotalAmount: number;
    }
  | {
      type: "quote_attempt";
      tier: string;
      url: string;
      expectedPriceUsdc: number;
    }
  | {
      type: "quote_paid";
      tier: string;
      amountUsdc: number;
      vendor: string;
      quote: Record<string, unknown>;
      spentTotal: number;
    }
  | {
      type: "quote_blocked";
      tier: string;
      code: string;
      message: string;
      spentTotal: number;
    }
  | {
      type: "raise_ask";
      summary: string;
      suggestedMaxPerTx: number;
      source: "serv" | "fallback";
    }
  | {
      type: "done";
      paidCount: number;
      blockedCount: number;
      spentTotal: number;
      sessionStatus: string;
    };

export type RunResult = {
  session: Pick<
    SealedSession,
    "id" | "token" | "status" | "spentTotal" | "expiresAt" | "payments"
  >;
  events: RunEvent[];
};

function absoluteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, "")}${path}`;
}

/** Local sealed-session runner (Kite-shaped errors, zero external spend). */
export async function executeSealedRun(
  plan: MandatePlan,
  origin: string,
): Promise<RunResult> {
  const session = createSealedSession(plan.mandate, {
    ...plan.session,
    mode: "demo_local",
  });

  const events: RunEvent[] = [
    {
      type: "session_approved",
      sessionId: session.id,
      mode: session.proposal.mode,
      maxAmountPerTx: session.proposal.maxAmountPerTx,
      maxTotalAmount: session.proposal.maxTotalAmount,
    },
  ];

  let paidCount = 0;
  let blockedCount = 0;
  let raiseSuggested = false;

  for (const step of plan.plan) {
    const path = quotePath(step.tier);
    const url = absoluteUrl(origin, path);
    const offer = QUOTE_CATALOG[step.tier];

    events.push({
      type: "quote_attempt",
      tier: step.tier,
      url,
      expectedPriceUsdc: offer.priceUsdc,
    });

    const decision = authorizePayment({
      token: session.token,
      amountUsdc: offer.priceUsdc,
      endpointUrl: url,
    });

    if (!decision.ok) {
      blockedCount += 1;
      events.push({
        type: "quote_blocked",
        tier: step.tier,
        code: decision.code,
        message: decision.message,
        spentTotal: session.spentTotal,
      });

      if (
        !raiseSuggested &&
        (decision.code === "session_rule_exceeded" ||
          decision.code === "session_total_exceeded")
      ) {
        raiseSuggested = true;
        const raise = await composeRaiseAsk({
          code: decision.code,
          message: decision.message,
          vendor: offer.vendor,
          tier: step.tier,
          priceUsdc: offer.priceUsdc,
          maxAmountPerTx: session.proposal.maxAmountPerTx,
          maxTotalAmount: session.proposal.maxTotalAmount,
          spentTotal: session.spentTotal,
        });
        events.push({
          type: "raise_ask",
          summary: raise.summary,
          suggestedMaxPerTx: raise.suggestedMaxPerTx,
          source: raise.source,
        });
      }

      if (
        decision.code === "session_rule_exceeded" ||
        decision.code === "session_total_exceeded"
      ) {
        break;
      }
      continue;
    }

    recordPayment(session, step.tier, offer.priceUsdc, url);
    paidCount += 1;

    const quote = {
      vendor: offer.vendor,
      city: plan.mandate.city,
      job: plan.mandate.job,
      areaM2: plan.mandate.areaM2,
      pricePerM2: offer.pricePerM2,
      estimatedTotalEur: Number(
        (offer.pricePerM2 * plan.mandate.areaM2).toFixed(2),
      ),
      leadDays: offer.leadDays,
      exclusions: offer.exclusions,
      summary: offer.summary,
      paidUsdcTest: offer.priceUsdc,
    };

    events.push({
      type: "quote_paid",
      tier: step.tier,
      amountUsdc: offer.priceUsdc,
      vendor: offer.vendor,
      quote,
      spentTotal: session.spentTotal,
    });
  }

  events.push({
    type: "done",
    paidCount,
    blockedCount,
    spentTotal: session.spentTotal,
    sessionStatus: session.status,
  });

  return {
    session: {
      id: session.id,
      token: session.token,
      status: session.status,
      spentTotal: session.spentTotal,
      expiresAt: session.expiresAt,
      payments: session.payments,
    },
    events,
  };
}

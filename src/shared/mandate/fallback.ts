import {
  DEFAULT_MANDATE_MESSAGE,
  type Mandate,
  type MandatePlan,
  type PlanStep,
  type SessionProposal,
  defaultMandate,
} from "@/shared/mandate/schema";
import {
  SEAL_PRICES_USDC,
  quotePath,
  resolveQuoteOffer,
  type QuoteTier,
} from "@/shared/quotes/catalog";

function num(match: RegExpMatchArray | null, fallback: number): number {
  if (!match?.[1]) return fallback;
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function parseJob(text: string, fallback: string): string {
  if (/solar\s*film|film\s*solaire|film\b/i.test(text)) {
    return "solar film install";
  }
  if (/\bhvac\b|air\s*condition|climatis/i.test(text)) {
    return "HVAC install";
  }
  if (/\bpaint|peinture|painting\b/i.test(text)) {
    return "office painting";
  }
  if (/\bwindow|fen[eê]tre|vitrage\b/i.test(text)) {
    return "window replacement";
  }
  if (/\broof|toiture\b/i.test(text)) {
    return "roof repair";
  }
  const quoted = text.match(
    /(?:quotes?\s+for|devis\s+(?:pour|de))\s+([^,.]+?)(?:\s+in\s+|\s+à\s+|,|\.|$)/i,
  );
  if (quoted?.[1]) {
    const job = quoted[1].replace(/\d+\s*m[²2]/i, "").trim();
    if (job.length >= 3) return job;
  }
  return fallback;
}

/** Deterministic NL parse when SERV is offline - keeps demos reproducible. */
export function parseMandateFallback(message: string): Mandate {
  const base = defaultMandate();
  const text = message.trim() || DEFAULT_MANDATE_MESSAGE;

  const area = num(text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i), base.areaM2);
  // Prefer "3 USDC total" before "total … N USDC" so ", 3 USDC total, 1 USDC max"
  // does not steal the per-quote amount as the session total.
  const maxTotal = num(
    text.match(
      /(\d+(?:[.,]\d+)?)\s*usdc[^\n]{0,24}(?:total|session|budget)/i,
    ) ??
      text.match(
        /(?:total\s+budget|session\s+budget|budget|total(?:\s+cap)?)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*usdc/i,
      ),
    base.maxTotalAmount,
  );
  const maxPerTx = num(
    text.match(
      /(?:max|plafond)\s+(\d+(?:[.,]\d+)?)\s*usdc(?:\s*(?:per|par|\/)\s*(?:quote|devis|tx)|\s*each)?/i,
    ) ??
      text.match(
        /(\d+(?:[.,]\d+)?)\s*usdc\s+(?:per|par)\s+(?:quote|devis|tx)/i,
      ) ??
      text.match(/(\d+(?:[.,]\d+)?)\s*usdc\s+max\s*(?:each|per)/i) ??
      text.match(/(\d+(?:[.,]\d+)?)\s*usdc\s+each\b/i),
    base.maxAmountPerTx,
  );
  const maxQuotes = Math.min(
    3,
    Math.max(
      1,
      Math.round(
        num(
          text.match(/(\d+)\s*(?:quotes?|devis)/i) ??
            text.match(
              /(\d+)\s+(?:[\wÀ-ÿ\-']+\s+){0,5}(?:quotes?|devis)/i,
            ) ??
            text.match(/(?:up to|get|buy)\s+(\d+)\b/i),
          base.maxQuotes,
        ),
      ),
    ),
  );
  const ttlHours = num(text.match(/(\d+)\s*h(?:ours?|eures?)?\b/i), base.ttlHours);

  const cityMatch = text.match(
    /\b(?:a|à|in)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\-']+(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\-']+)?)/i,
  );
  const city = cityMatch?.[1] ?? base.city;

  return {
    ...base,
    job: parseJob(text, base.job),
    city,
    areaM2: area,
    maxQuotes,
    maxAmountPerTx: maxPerTx,
    maxTotalAmount: maxTotal,
    ttlHours,
  };
}

export function buildPlan(mandate: Mandate): {
  plan: PlanStep[];
  rationale: string;
} {
  const order: QuoteTier[] = ["cheap", "standard", "premium"];
  const plan: PlanStep[] = [];

  for (const tier of order) {
    if (plan.length >= mandate.maxQuotes) break;
    if (!mandate.preferredTiers.includes(tier)) continue;
    const offer = resolveQuoteOffer(mandate.job, tier);
    plan.push({
      tier,
      expectedPriceUsdc: offer.priceUsdc,
      reason:
        offer.priceUsdc <= mandate.maxAmountPerTx
          ? `Within the per-quote seal (${offer.priceUsdc} <= ${mandate.maxAmountPerTx}).`
          : `Above the per-quote seal (${offer.priceUsdc} > ${mandate.maxAmountPerTx}) - expect a block.`,
    });
  }

  if (plan.length === 0) {
    plan.push({
      tier: "cheap",
      expectedPriceUsdc: SEAL_PRICES_USDC.cheap,
      reason: "Start with the entry merchant.",
    });
  }

  const rationale = `Buy up to ${mandate.maxQuotes} quotes for ${mandate.areaM2} m2 ${mandate.job} in ${mandate.city}. Stop if a quote exceeds ${mandate.maxAmountPerTx} USDC per tx or total ${mandate.maxTotalAmount} USDC.`;

  return { plan, rationale };
}

export function buildSessionProposal(
  mandate: Mandate,
  origin: string,
): SessionProposal {
  const endpoints = mandate.preferredTiers.map(
    (tier) => `${origin.replace(/\/$/, "")}${quotePath(tier)}`,
  );

  return {
    taskSummary: `QuoteSeal sealed buy: ${mandate.maxQuotes} quotes for ${mandate.job} (${mandate.areaM2} m2, ${mandate.city})`,
    maxAmountPerTx: mandate.maxAmountPerTx,
    maxTotalAmount: mandate.maxTotalAmount,
    ttlHours: mandate.ttlHours,
    assets: "USDC",
    allowedEndpoints: endpoints,
    mode: "demo_local",
  };
}

export function buildFallbackPlan(
  message: string,
  origin: string,
): MandatePlan {
  const mandate = parseMandateFallback(message);
  const { plan, rationale } = buildPlan(mandate);
  return {
    mandate,
    session: buildSessionProposal(mandate, origin),
    plan,
    rationale,
    source: "fallback",
  };
}

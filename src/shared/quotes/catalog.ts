export type QuoteTier = "cheap" | "standard" | "premium";

export type QuoteOffer = {
  tier: QuoteTier;
  vendor: string;
  priceUsdc: number;
  pricePerM2: number;
  leadDays: number;
  exclusions: string[];
  summary: string;
};

/** Local x402 merchants - fixtures only, no paid upstream APIs. */
export const QUOTE_CATALOG: Record<QuoteTier, QuoteOffer> = {
  cheap: {
    tier: "cheap",
    vendor: "NordGlass Express",
    priceUsdc: 0.3,
    pricePerM2: 42,
    leadDays: 21,
    exclusions: ["scaffolding", "high-rise access"],
    summary: "Entry quote - longer lead time, basic film stack.",
  },
  standard: {
    tier: "standard",
    vendor: "Seine Film Pro",
    priceUsdc: 0.8,
    pricePerM2: 58,
    leadDays: 10,
    exclusions: ["weekend install"],
    summary: "Balanced quote - mid film, weekday crew.",
  },
  premium: {
    tier: "premium",
    vendor: "Atlas Solar Shield",
    priceUsdc: 1.5,
    pricePerM2: 79,
    leadDays: 5,
    exclusions: [],
    summary: "Fast premium quote - exceeds default 1 USDC / tx seal.",
  },
};

export const QUOTE_TIERS: QuoteTier[] = ["cheap", "standard", "premium"];

export function quotePath(tier: QuoteTier): string {
  return `/api/x402/quote/${tier}`;
}

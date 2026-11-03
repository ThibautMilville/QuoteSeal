export type QuoteTier = "cheap" | "standard" | "premium";

export type JobCategory = "solar_film" | "paint" | "hvac" | "generic";

export type QuoteOffer = {
  tier: QuoteTier;
  category: JobCategory;
  vendor: string;
  /** Short mark for paid cards (2-3 letters). */
  mark: string;
  priceUsdc: number;
  /** EUR heuristic unit for estimatedTotalEur (m2 or equivalent floor area). */
  pricePerM2: number;
  leadDays: number;
  exclusions: string[];
  summary: string;
};

/** Seal prices - keep fixed so Lyon block-premium / Paris allow-premium demos stay valid. */
export const SEAL_PRICES_USDC: Record<QuoteTier, number> = {
  cheap: 0.3,
  standard: 0.8,
  premium: 1.5,
};

type CategoryTierCopy = Omit<QuoteOffer, "tier" | "category" | "priceUsdc">;

const CATEGORY_COPY: Record<JobCategory, Record<QuoteTier, CategoryTierCopy>> = {
  solar_film: {
    cheap: {
      vendor: "NordGlass Express",
      mark: "NG",
      pricePerM2: 42,
      leadDays: 21,
      exclusions: ["scaffolding", "high-rise access"],
      summary: "Entry solar-film quote - longer lead time, basic film grade.",
    },
    standard: {
      vendor: "Seine Film Pro",
      mark: "SF",
      pricePerM2: 58,
      leadDays: 10,
      exclusions: ["weekend install"],
      summary: "Balanced solar-film quote - mid film grade, weekday crew.",
    },
    premium: {
      vendor: "Atlas Solar Shield",
      mark: "AS",
      pricePerM2: 79,
      leadDays: 5,
      exclusions: [],
      summary: "Fast premium solar-film quote - often above a 1 USDC per-quote seal.",
    },
  },
  paint: {
    cheap: {
      vendor: "Loire Coat Express",
      mark: "LC",
      pricePerM2: 18,
      leadDays: 18,
      exclusions: ["ceilings above 3.2 m", "specialty coatings"],
      summary: "Entry painting quote - standard emulsion, longer lead time.",
    },
    standard: {
      vendor: "Nantes Finish Studio",
      mark: "NF",
      pricePerM2: 28,
      leadDays: 9,
      exclusions: ["weekend shifts"],
      summary: "Balanced painting quote - prep + two coats, weekday crew.",
    },
    premium: {
      vendor: "Atelier Couleur Plus",
      mark: "AC",
      pricePerM2: 42,
      leadDays: 5,
      exclusions: [],
      summary: "Premium painting quote - fast slot, low-VOC finish options.",
    },
  },
  hvac: {
    cheap: {
      vendor: "ClimaNord Express",
      mark: "CN",
      pricePerM2: 55,
      leadDays: 24,
      exclusions: ["duct redesign", "after-hours install"],
      summary: "Entry HVAC quote - split/VRV basics, longer lead time.",
    },
    standard: {
      vendor: "Seine Air Systems",
      mark: "SA",
      pricePerM2: 78,
      leadDays: 12,
      exclusions: ["structural cutting"],
      summary: "Balanced HVAC quote - mid-tier kit, weekday commissioning.",
    },
    premium: {
      vendor: "Atlas Comfort HVAC",
      mark: "AH",
      pricePerM2: 110,
      leadDays: 6,
      exclusions: [],
      summary: "Premium HVAC quote - fast install window, full commissioning.",
    },
  },
  generic: {
    cheap: {
      vendor: "Local Trade Quotes",
      mark: "LT",
      pricePerM2: 35,
      leadDays: 20,
      exclusions: ["specialized permits"],
      summary: "Entry quote from a local merchant - longer lead time, basic scope.",
    },
    standard: {
      vendor: "Metro Works Co",
      mark: "MW",
      pricePerM2: 52,
      leadDays: 10,
      exclusions: ["weekend work"],
      summary: "Balanced quote from a local merchant - mid scope, weekday crew.",
    },
    premium: {
      vendor: "Apex Field Services",
      mark: "AF",
      pricePerM2: 74,
      leadDays: 5,
      exclusions: [],
      summary: "Premium quote from a local merchant - fast slot, wider scope.",
    },
  },
};

export const QUOTE_TIERS: QuoteTier[] = ["cheap", "standard", "premium"];

/** Resolve job text into a pricing/vendor category. */
export function resolveJobCategory(job: string): JobCategory {
  const text = job.trim();
  if (/solar\s*film|film\s*solaire|(?:^|[\s\-])film(?:$|[\s\-])/i.test(text)) {
    return "solar_film";
  }
  if (/\bhvac\b|air\s*condition|climatis|clim\b|heating\s*and\s*cooling/i.test(text)) {
    return "hvac";
  }
  if (/\bpaint|peinture|painting|coating\b/i.test(text)) {
    return "paint";
  }
  return "generic";
}

export function categoryLabel(category: JobCategory): string {
  switch (category) {
    case "solar_film":
      return "solar-film";
    case "paint":
      return "painting";
    case "hvac":
      return "HVAC";
    default:
      return "local";
  }
}

/** Pick vendor, EUR heuristic, and copy from mandate.job - seal USDC stays fixed. */
export function resolveQuoteOffer(job: string, tier: QuoteTier): QuoteOffer {
  const category = resolveJobCategory(job);
  const copy = CATEGORY_COPY[category][tier];
  return {
    tier,
    category,
    priceUsdc: SEAL_PRICES_USDC[tier],
    ...copy,
  };
}

export function estimateTotalEur(offer: QuoteOffer, areaM2: number): number {
  return Number((offer.pricePerM2 * areaM2).toFixed(2));
}

/**
 * Default catalog (solar film) for x402 fixture discovery / health.
 * Paid-run content should use resolveQuoteOffer(job, tier).
 */
export const QUOTE_CATALOG: Record<QuoteTier, QuoteOffer> = {
  cheap: resolveQuoteOffer("solar film install", "cheap"),
  standard: resolveQuoteOffer("solar film install", "standard"),
  premium: resolveQuoteOffer("solar film install", "premium"),
};

export function quotePath(tier: QuoteTier): string {
  return `/api/x402/quote/${tier}`;
}

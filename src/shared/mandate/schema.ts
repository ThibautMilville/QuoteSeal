import { z } from "zod";
import { QUOTE_TIERS, type QuoteTier } from "@/shared/quotes/catalog";

export const MandateSchema = z.object({
  job: z.string().min(1),
  city: z.string().min(1),
  areaM2: z.number().positive(),
  maxQuotes: z.number().int().min(1).max(3),
  maxAmountPerTx: z.number().positive(),
  maxTotalAmount: z.number().positive(),
  ttlHours: z.number().positive(),
  preferredTiers: z.array(z.enum(["cheap", "standard", "premium"])).min(1),
});

export type Mandate = z.infer<typeof MandateSchema>;

export const SessionProposalSchema = z.object({
  taskSummary: z.string(),
  maxAmountPerTx: z.number().positive(),
  maxTotalAmount: z.number().positive(),
  ttlHours: z.number().positive(),
  assets: z.literal("USDC"),
  allowedEndpoints: z.array(z.string()),
  mode: z.enum(["demo_local", "kite_sandbox"]),
});

export type SessionProposal = z.infer<typeof SessionProposalSchema>;

export const PlanStepSchema = z.object({
  tier: z.enum(["cheap", "standard", "premium"]),
  reason: z.string(),
  expectedPriceUsdc: z.number(),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;

export const MandatePlanSchema = z.object({
  mandate: MandateSchema,
  session: SessionProposalSchema,
  plan: z.array(PlanStepSchema).min(1),
  rationale: z.string(),
  source: z.enum(["serv", "fallback"]),
});

export type MandatePlan = z.infer<typeof MandatePlanSchema>;

export const DEFAULT_MANDATE_MESSAGE =
  "Get up to 3 quotes for a 40 m2 solar-film install in Boulogne. Total budget 3 USDC. Max 1 USDC per quote. Valid for 2 hours.";

export function defaultMandate(): Mandate {
  return {
    job: "solar film install",
    city: "Boulogne",
    areaM2: 40,
    maxQuotes: 3,
    maxAmountPerTx: 1,
    maxTotalAmount: 3,
    ttlHours: 2,
    preferredTiers: [...QUOTE_TIERS],
  };
}

export function isQuoteTier(value: string): value is QuoteTier {
  return (QUOTE_TIERS as string[]).includes(value);
}

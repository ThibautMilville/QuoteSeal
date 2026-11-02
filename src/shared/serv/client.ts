import OpenAI from "openai";
import {
  MandatePlanSchema,
  type MandatePlan,
} from "@/shared/mandate/schema";
import {
  buildFallbackPlan,
  buildPlan,
  buildSessionProposal,
  parseMandateFallback,
} from "@/shared/mandate/fallback";
import { QUOTE_CATALOG } from "@/shared/quotes/catalog";
import {
  SERV_BASE_URL,
  hasServApiKey,
  modelForStep,
} from "@/shared/serv/model-policy";

export { hasServApiKey } from "@/shared/serv/model-policy";

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in SERV reply");
  return JSON.parse(raw.slice(start, end + 1));
}

const INTENT_SYSTEM = `You compile a natural-language buying mandate into a sealed spending plan for QuoteSeal (SERV Hackathon / Kite track).
Return ONLY JSON with this shape:
{
  "job": string,
  "city": string,
  "areaM2": number,
  "maxQuotes": 1|2|3,
  "maxAmountPerTx": number,
  "maxTotalAmount": number,
  "ttlHours": number,
  "preferredTiers": array of "cheap"|"standard"|"premium",
  "rationale": string
}
Rules:
- Prefer staying inside the user's stated USDC caps.
- available merchants: cheap=${QUOTE_CATALOG.cheap.priceUsdc}, standard=${QUOTE_CATALOG.standard.priceUsdc}, premium=${QUOTE_CATALOG.premium.priceUsdc} USDC.
- Do not invent other tiers.
- Judgment only: code will rebuild the executable plan and session endpoints.`;

function getClient() {
  return new OpenAI({
    apiKey: process.env.SERV_API_KEY,
    baseURL: SERV_BASE_URL,
  });
}

export async function compileMandatePlan(
  message: string,
  origin: string,
): Promise<MandatePlan> {
  if (!hasServApiKey()) {
    return buildFallbackPlan(message, origin);
  }

  try {
    const completion = await getClient().chat.completions.create({
      model: modelForStep("intent"),
      temperature: 0.2,
      messages: [
        { role: "system", content: INTENT_SYSTEM },
        { role: "user", content: message },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJsonObject(content) as Record<string, unknown>;
    const seed = parseMandateFallback(message);

    const mandate = {
      job: String(parsed.job ?? seed.job),
      city: String(parsed.city ?? seed.city),
      areaM2: Number(parsed.areaM2 ?? seed.areaM2),
      maxQuotes: Number(parsed.maxQuotes ?? seed.maxQuotes),
      maxAmountPerTx: Number(parsed.maxAmountPerTx ?? seed.maxAmountPerTx),
      maxTotalAmount: Number(parsed.maxTotalAmount ?? seed.maxTotalAmount),
      ttlHours: Number(parsed.ttlHours ?? seed.ttlHours),
      preferredTiers: Array.isArray(parsed.preferredTiers)
        ? (parsed.preferredTiers as MandatePlan["mandate"]["preferredTiers"])
        : seed.preferredTiers,
    };

    const { plan, rationale: fallbackRationale } = buildPlan(mandate);
    const result: MandatePlan = {
      mandate,
      session: buildSessionProposal(mandate, origin),
      plan,
      rationale: String(parsed.rationale ?? fallbackRationale),
      source: "serv",
    };

    return MandatePlanSchema.parse(result);
  } catch {
    return buildFallbackPlan(message, origin);
  }
}

export type RaiseAskInput = {
  code: string;
  message: string;
  vendor: string;
  tier: string;
  priceUsdc: number;
  maxAmountPerTx: number;
  maxTotalAmount: number;
  spentTotal: number;
};

export type RaiseAskResult = {
  summary: string;
  suggestedMaxPerTx: number;
  source: "serv" | "fallback";
};

export function buildRaiseAskFallback(input: RaiseAskInput): RaiseAskResult {
  const suggestedMaxPerTx = Math.max(input.maxAmountPerTx, input.priceUsdc);
  if (input.code === "session_rule_exceeded") {
    return {
      summary: `Needs a new approval with at least ${input.priceUsdc} USDC per quote before retrying ${input.vendor}. The current seal will not silently raise.`,
      suggestedMaxPerTx,
      source: "fallback",
    };
  }
  return {
    summary: `Needs a new approval with a higher total budget. Spent ${input.spentTotal} of ${input.maxTotalAmount} USDC. The current seal will not silently raise.`,
    suggestedMaxPerTx,
    source: "fallback",
  };
}

/** Judgment-only raise copy after a sealed-session block. */
export async function composeRaiseAsk(
  input: RaiseAskInput,
): Promise<RaiseAskResult> {
  const fallback = buildRaiseAskFallback(input);
  if (!hasServApiKey()) return fallback;

  try {
    const completion = await getClient().chat.completions.create({
      model: modelForStep("raise"),
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You write a short raise-ask for a spending-session agent. Return ONLY JSON {\"summary\": string, \"suggestedMaxPerTx\": number}. Never suggest silent retry on the same session. Keep under 280 characters. English only.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    });
    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJsonObject(content) as Record<string, unknown>;
    return {
      summary: String(parsed.summary ?? fallback.summary),
      suggestedMaxPerTx: Number(
        parsed.suggestedMaxPerTx ?? fallback.suggestedMaxPerTx,
      ),
      source: "serv",
    };
  } catch {
    return fallback;
  }
}

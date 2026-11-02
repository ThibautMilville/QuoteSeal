/**
 * Cost-aware model routing for SERV.
 * Call sites use modelForStep / tierForStep; never hardcode models in views.
 */

export const SERV_BASE_URL =
  process.env.SERV_BASE_URL?.trim() || "https://inference-api.openserv.ai/v1";

export const SERV_DEFAULT_MODEL_FAST = "gpt-5.4-mini";
export const SERV_DEFAULT_MODEL_SMALL = "gpt-5.4-mini";
export const SERV_DEFAULT_MODEL_LARGE = "gpt-5.4";

export type ServModelTier = "fast" | "small" | "large";

export type ServStepId = "intent" | "raise" | "agent";

const DEFAULT_STEP_TIERS: Record<ServStepId, ServModelTier> = {
  intent: "fast",
  raise: "small",
  agent: "small",
};

function parseTier(raw: string | undefined): ServModelTier | null {
  const value = raw?.trim().toLowerCase();
  if (value === "fast" || value === "small" || value === "large") return value;
  return null;
}

export function tierForStep(step: ServStepId): ServModelTier {
  const envKey = `SERV_TIER_${step.toUpperCase()}`;
  return parseTier(process.env[envKey]) ?? DEFAULT_STEP_TIERS[step];
}

export function servModels(): Record<ServModelTier, string> {
  return {
    fast:
      process.env.SERV_MODEL_FAST?.trim() ||
      process.env.SERV_MODEL?.trim() ||
      SERV_DEFAULT_MODEL_FAST,
    small:
      process.env.SERV_MODEL_SMALL?.trim() ||
      process.env.SERV_MODEL?.trim() ||
      SERV_DEFAULT_MODEL_SMALL,
    large:
      process.env.SERV_MODEL_LARGE?.trim() ||
      process.env.SERV_MODEL_JUDGE?.trim() ||
      SERV_DEFAULT_MODEL_LARGE,
  };
}

export function modelForStep(step: ServStepId): string {
  return servModels()[tierForStep(step)];
}

export function hasServApiKey(): boolean {
  return Boolean(process.env.SERV_API_KEY?.trim());
}

export function modelPolicyHealth() {
  return {
    configured: hasServApiKey(),
    baseUrl: SERV_BASE_URL,
    models: servModels(),
    tiers: {
      intent: tierForStep("intent"),
      raise: tierForStep("raise"),
      agent: tierForStep("agent"),
    },
  };
}

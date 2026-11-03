import { NextResponse } from "next/server";
import { getKiteStatus } from "@/shared/kite/cli";
import { QUOTE_CATALOG } from "@/shared/quotes/catalog";
import { modelPolicyHealth } from "@/shared/serv/model-policy";

export async function GET() {
  const kite = await getKiteStatus();

  return NextResponse.json({
    ok: true,
    app: "quote-seal",
    track: "kite",
    mode: kite.modeHint,
    serv: modelPolicyHealth(),
    kite: {
      installed: kite.installed,
      version: kite.version,
      backendReachable: kite.backendReachable,
      loggedIn: kite.loggedIn,
      agentRegistered: kite.agentRegistered,
      sessionActive: kite.sessionActive,
      nextCommand: kite.nextCommand,
      error: kite.error,
    },
    merchants: Object.values(QUOTE_CATALOG).map((q) => ({
      tier: q.tier,
      vendor: q.vendor,
      category: q.category,
      priceUsdc: q.priceUsdc,
      path: `/api/x402/quote/${q.tier}`,
    })),
    note: "Zero real spend in this demo. Merchant names/EUR heuristics resolve from mandate.job (solar film, paint, HVAC, generic). Seal USDC tiers stay fixed. Optional SERV_API_KEY enables live intent compile.",
  });
}

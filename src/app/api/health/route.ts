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
    rail: kite.rail,
    serv: modelPolicyHealth(),
    kite: {
      installed: kite.installed,
      version: kite.version,
      backendReachable: kite.backendReachable,
      loggedIn: kite.loggedIn,
      agentRegistered: kite.agentRegistered,
      sessionActive: kite.sessionActive,
      canCreateSession: kite.canCreateSession,
      identitySource: kite.identitySource,
      agentId: kite.agentId,
      agentLabel: kite.agentLabel,
      agentType: kite.agentType,
      userEmail: kite.userEmail,
      sessionId: kite.sessionId,
      rail: kite.rail,
      connectUrl: kite.connectUrl,
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
    note: "Safety: quote-network fixtures do not move real funds unless a Passport session is explicitly approved.",
  });
}

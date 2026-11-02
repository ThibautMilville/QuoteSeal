import { NextRequest, NextResponse } from "next/server";
import { isQuoteTier } from "@/shared/mandate/schema";
import { QUOTE_CATALOG } from "@/shared/quotes/catalog";
import {
  authorizePayment,
  getSessionByToken,
  recordPayment,
} from "@/shared/session/store";

type Ctx = { params: Promise<{ tier: string }> };

function resourceUrl(req: NextRequest, tier: string): string {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin;
  return `${origin.replace(/\/$/, "")}/api/x402/quote/${tier}`;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { tier: raw } = await ctx.params;
  if (!isQuoteTier(raw)) {
    return NextResponse.json({ error: "Unknown quote tier" }, { status: 404 });
  }

  const offer = QUOTE_CATALOG[raw];
  const url = resourceUrl(req, raw);
  const paymentHeader = req.headers.get("x-payment");

  const decision = authorizePayment({
    token: paymentHeader,
    amountUsdc: offer.priceUsdc,
    endpointUrl: url,
  });

  if (!decision.ok) {
    if (decision.code === "missing_payment") {
      return NextResponse.json(
        {
          error: "X-PAYMENT header is required",
          accepts: [
            {
              scheme: "quote-seal-demo",
              network: "demo-local",
              maxAmountRequired: String(offer.priceUsdc),
              resource: url,
              description: `${offer.vendor} quote API (fixture)`,
              mimeType: "application/json",
              payTo: "demo_local_treasury",
              asset: "USDC-TEST",
              merchantName: offer.vendor,
            },
          ],
          x402Version: 1,
        },
        {
          status: 402,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return NextResponse.json(
      {
        error: decision.message,
        error_code: decision.code,
        spentTotal: decision.session?.spentTotal ?? 0,
      },
      { status: 403 },
    );
  }

  recordPayment(decision.session, raw, offer.priceUsdc, url);
  const session = getSessionByToken(decision.session.token);

  return NextResponse.json({
    ok: true,
    tier: raw,
    vendor: offer.vendor,
    priceUsdcTest: offer.priceUsdc,
    pricePerM2: offer.pricePerM2,
    leadDays: offer.leadDays,
    exclusions: offer.exclusions,
    summary: offer.summary,
    session: session
      ? {
          id: session.id,
          spentTotal: session.spentTotal,
          status: session.status,
        }
      : null,
  });
}

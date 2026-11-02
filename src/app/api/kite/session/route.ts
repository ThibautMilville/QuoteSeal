import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createKiteSessionRequest, getKiteStatus } from "@/shared/kite/cli";

const BodySchema = z.object({
  taskSummary: z.string().min(1),
  maxAmountPerTx: z.number().positive(),
  maxTotalAmount: z.number().positive(),
  ttlHours: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const status = await getKiteStatus();
  if (!status.installed) {
    return NextResponse.json(
      {
        error: "kpass_not_installed",
        hint: status.nextCommand,
        fallback: "demo_local",
      },
      { status: 503 },
    );
  }
  if (!status.loggedIn) {
    return NextResponse.json(
      {
        error: "kite_not_logged_in",
        hint: status.nextCommand ?? "kpass signup init --email you@example.com --output json",
        fallback: "demo_local",
      },
      { status: 401 },
    );
  }

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid_body", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const result = await createKiteSessionRequest(body.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: "kite_session_failed", detail: result.error, fallback: "demo_local" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "kite_sandbox",
    sessionRequest: result.data,
  });
}

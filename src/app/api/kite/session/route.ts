import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createKiteSessionRequest,
  extractApprovalUrl,
  getKiteStatus,
} from "@/shared/kite/cli";

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
        fallback: "sealed",
        rail: "sealed",
      },
      { status: 503 },
    );
  }
  if (!status.loggedIn || !status.canCreateSession) {
    return NextResponse.json(
      {
        error: "kite_not_logged_in",
        hint:
          status.nextCommand ??
          "kpass signup init --email you@example.com --output json",
        fallback: "sealed",
        rail: "sealed",
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
      {
        error: "kite_session_failed",
        detail: result.error,
        fallback: "sealed",
        rail: "sealed",
      },
      { status: 502 },
    );
  }

  const approvalUrl = extractApprovalUrl(result.data);

  return NextResponse.json({
    ok: true,
    rail: "passport",
    mode: "kite_sandbox",
    agentId: status.agentId,
    approvalUrl,
    sessionRequest: result.data,
  });
}

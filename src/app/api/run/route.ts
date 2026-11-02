import { NextRequest, NextResponse } from "next/server";
import { MandatePlanSchema } from "@/shared/mandate/schema";
import { executeSealedRun } from "@/shared/run/execute";

function originFrom(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    req.nextUrl.origin ||
    "http://localhost:3010"
  );
}

function planCandidate(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const record = body as Record<string, unknown>;
  // UI sends `{ plan: MandatePlan }`; direct POSTs may send MandatePlan itself.
  // Do not treat MandatePlan.plan (step array) as the full payload.
  if (
    record.plan &&
    typeof record.plan === "object" &&
    !Array.isArray(record.plan) &&
    "mandate" in (record.plan as object)
  ) {
    return record.plan;
  }
  return body;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = MandatePlanSchema.safeParse(planCandidate(body));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid mandate plan", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await executeSealedRun(parsed.data, originFrom(req));
  return NextResponse.json(result);
}

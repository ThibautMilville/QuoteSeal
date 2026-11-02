import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MANDATE_MESSAGE } from "@/shared/mandate/schema";
import { compileMandatePlan } from "@/shared/serv/client";

function originFrom(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    req.nextUrl.origin ||
    "http://localhost:3010"
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const message = body.message?.trim() || DEFAULT_MANDATE_MESSAGE;
  const plan = await compileMandatePlan(message, originFrom(req));
  return NextResponse.json(plan);
}

import { NextResponse } from "next/server";
import { getKiteStatus } from "@/shared/kite/cli";

export async function GET() {
  const kite = await getKiteStatus();
  return NextResponse.json(kite);
}

import { NextResponse } from "next/server";

import { getWalletSnapshot } from "@/lib/wdk/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getWalletSnapshot());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown wallet error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

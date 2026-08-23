import { NextResponse } from "next/server";

import { getEthMarket } from "@/lib/pricing/eth";

export const dynamic = "force-dynamic";

/**
 * Market reference only.
 *
 * This is what ETH trades at, not what the user holds — GoFI has never bought
 * ETH for anyone. The route exists so the dashboard can say what the market is
 * doing without pretending the number belongs to the reader.
 */
export async function GET() {
  try {
    const market = await getEthMarket();

    if (!market) {
      return NextResponse.json(
        { error: "The ETH/USD₮ pair did not resolve upstream." },
        { status: 502 }
      );
    }

    return NextResponse.json(market);
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unknown error" },
      { status: 502 }
    );
  }
}

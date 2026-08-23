import "server-only";

import { PricingProvider } from "@tetherto/wdk-pricing-provider";
import { BitfinexPricingClient } from "@tetherto/wdk-pricing-bitfinex-http";

/**
 * Bitfinex quotes Tether as UST, not USDT.
 *
 * Asking for the pair the way a user would write it — ETH/USDT — resolves to
 * nothing and getLastPriceData returns null. Verified against the live API.
 */
const BASE = "ETH";
const QUOTE = "UST";

/** Prices move; a stale figure on screen is worse than a slow one. */
const CACHE_MS = 60_000;

let provider: PricingProvider | null = null;

function getProvider(): PricingProvider {
  provider ??= new PricingProvider({
    client: new BitfinexPricingClient(),
    priceCacheDurationMs: CACHE_MS,
  });

  return provider;
}

export type EthMarket = {
  /** ETH priced in Tether, as traded on Bitfinex. */
  price: number;
  /** Absolute 24h move, same units as price. */
  dailyChange: number;
  /** Relative 24h move as a percentage, already multiplied by 100. */
  dailyChangePct: number;
  /** Oldest-first, for drawing left to right. */
  history: { ts: number; price: number }[];
  fetchedAt: number;
};

/**
 * The shipped types disagree with the runtime on two counts, both verified
 * against the live API: history points carry `ts`, not the declared
 * `timestamp`, and getLastPriceData can resolve to null even though it is typed
 * as always returning PriceData. Both are narrowed here rather than trusted.
 */
type RawPoint = { price: number; ts?: number; timestamp?: number };

export async function getEthMarket(days = 7): Promise<EthMarket | null> {
  const pricing = getProvider();
  const end = Date.now();

  const data = (await pricing.getLastPriceData(BASE, QUOTE)) as {
    lastPrice: number;
    dailyChange: number;
    dailyChangeRelative: number;
  } | null;

  if (!data) return null;

  // A missing chart is survivable; a missing price is not. The sparkline is
  // allowed to fail on its own without taking the quote down with it.
  let history: EthMarket["history"] = [];

  try {
    const raw = (await pricing.getHistoricalPrice(BASE, QUOTE, {
      start: end - days * 86_400_000,
      end,
      timeframe: "1D",
    })) as unknown as RawPoint[];

    history = raw
      .map((point) => ({ ts: point.ts ?? point.timestamp ?? 0, price: point.price }))
      .filter((point) => point.ts > 0)
      // The API answers newest-first.
      .sort((a, b) => a.ts - b.ts);
  } catch {
    history = [];
  }

  return {
    price: data.lastPrice,
    dailyChange: data.dailyChange,
    dailyChangePct: data.dailyChangeRelative * 100,
    history,
    fetchedAt: end,
  };
}

"use client";

import { useEffect, useState } from "react";

type Market = {
  price: number;
  dailyChange: number;
  dailyChangePct: number;
  history: { ts: number; price: number }[];
  fetchedAt: number;
};

const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Builds the polyline and the area beneath it from the raw price series. */
function sparkline(points: { price: number }[], width: number, height: number) {
  const prices = points.map((point) => point.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  // A flat series would divide by zero; a 1-unit band draws it as a centre line.
  const band = high - low || 1;

  const coords = points.map((point, index) => {
    const x = (index / Math.max(1, points.length - 1)) * width;
    const y = height - ((point.price - low) / band) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return {
    line: `M${coords.join(" L")}`,
    area: `M0,${height} L${coords.join(" L")} L${width},${height} Z`,
    low,
    high,
  };
}

/**
 * What ETH is worth — not what the reader owns.
 *
 * The strategy recommends an ETH leg that GoFI has never executed, so this is
 * labelled as a market reference and priced in Tether, the unit the goal is
 * denominated in. Putting it beside the goal without that label would be the
 * quickest way to imply a position that does not exist.
 */
export function EthMarket() {
  const [market, setMarket] = useState<Market | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const response = await fetch("/api/market/eth");
        const payload = await response.json();
        if (!alive) return;
        if (!response.ok) throw new Error(payload.error);
        setMarket(payload as Market);
      } catch {
        if (alive) setFailed(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // The dashboard is about the goal. A market panel that cannot load its market
  // has nothing to say, so it says nothing rather than showing an error.
  if (failed || !market) return null;

  const up = market.dailyChangePct >= 0;
  const tone = up ? "text-emerald-300" : "text-rose-300";
  const stroke = up ? "#6ee7b7" : "#fda4af";
  const spark =
    market.history.length > 1 ? sparkline(market.history, 320, 56) : null;

  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
            ETH / USD&#8366; · market reference
          </p>
          <p className="mt-2 font-mono text-2xl text-white tabular-nums">
            {money.format(market.price)}
          </p>
          <p className={`mt-1 font-mono text-xs tabular-nums ${tone}`}>
            {up ? "▲" : "▼"} {money.format(Math.abs(market.dailyChange))} (
            {market.dailyChangePct.toFixed(2)}%) · 24h
          </p>
        </div>

        {spark && (
          <div className="flex flex-col items-end gap-1">
            <svg
              viewBox="0 0 320 56"
              className="h-14 w-[240px] sm:w-[320px]"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="eth-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={spark.area} fill="url(#eth-fade)" />
              <path
                d={spark.line}
                fill="none"
                stroke={stroke}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <p className="font-mono text-[10px] text-white/25 tabular-nums">
              7d · {money.format(spark.low)} – {money.format(spark.high)}
            </p>
          </div>
        )}
      </div>

      <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-white/25">
        Bitfinex spot, via WDK&rsquo;s pricing provider. Shown because the
        strategy names an ETH leg — GoFI has not bought any, so this is the
        market, not your balance.
      </p>
    </div>
  );
}

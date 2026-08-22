import type { ReactNode } from "react";

type Rail = {
  name: string;
  /** Brand-adjacent accent. Colours are not trademarked the way logos are. */
  color: string;
  mark: ReactNode;
  live?: boolean;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const USDT: Rail = {
  name: "USD₮",
  color: "#26a17b",
  live: true,
  mark: (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M8 9h8M12 9v7" {...stroke} />
    </svg>
  ),
};

const WDK: Rail = {
  name: "WDK",
  color: "#38bdf8",
  live: true,
  mark: (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" {...stroke} />
      <path d="M12 11.5 20 7M12 11.5 4 7M12 11.5V20" {...stroke} />
    </svg>
  ),
};

const AAVE: Rail = {
  name: "Aave",
  color: "#b6509e",
  mark: (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M8 16 12 7l4 9M9.5 13.5h5" {...stroke} />
    </svg>
  ),
};

const LIDO: Rail = {
  name: "Lido",
  color: "#00a3ff",
  mark: (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path d="M12 3.5 5.5 13 12 17l6.5-4z" {...stroke} />
      <path d="M5.5 15.5 12 20.5l6.5-5" {...stroke} />
    </svg>
  ),
};

const UNISWAP: Rail = {
  name: "Uniswap",
  color: "#ff007a",
  mark: (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path d="M7 8h10l-3-3M17 16H7l3 3" {...stroke} />
    </svg>
  ),
};

const MOONPAY: Rail = {
  name: "MoonPay",
  color: "#7d00ff",
  mark: (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <circle cx="9.5" cy="9.5" r="5" {...stroke} />
      <circle cx="15" cy="15" r="3.5" {...stroke} />
    </svg>
  ),
};

function Tile({ rail, delay }: { rail: Rail; delay: number }) {
  return (
    <div
      title={rail.name}
      style={{ color: rail.color, animationDelay: `${delay}ms` }}
      className="tile-in group relative grid h-[68px] w-[68px] place-items-center rounded-2xl border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.06]"
    >
      {rail.mark}
      {rail.live && (
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
    </div>
  );
}

/**
 * The rails GoFI runs on, arranged around GoFI itself.
 *
 * The cluster is a 2–3–2 stagger with the product in the middle, so the shape
 * says what the paragraph says: everything here is infrastructure GoFI sits on
 * top of, not something it replaces.
 */
export function Protocols() {
  return (
    <section className="mb-14 grid items-center gap-10 sm:grid-cols-[auto_1fr] sm:gap-12">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-3">
          <Tile rail={USDT} delay={0} />
          <Tile rail={AAVE} delay={60} />
        </div>

        <div className="flex gap-3">
          <Tile rail={LIDO} delay={120} />

          {/* The hub. Larger and lit, because everything else orbits it. */}
          <div
            className="tile-in relative grid h-[68px] w-[68px] place-items-center rounded-2xl border border-spark/40 bg-spark/[0.08] shadow-[0_0_24px_-6px_var(--spark)]"
            style={{ animationDelay: "180ms" }}
            title="GoFI"
          >
            <span className="text-sm font-semibold tracking-tight text-spark">
              GoFI
            </span>
          </div>

          <Tile rail={UNISWAP} delay={240} />
        </div>

        <div className="flex gap-3">
          <Tile rail={WDK} delay={300} />
          <Tile rail={MOONPAY} delay={360} />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
          Built on rails
          <br />
          you already trust
        </h2>

        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
          GoFI does not run its own exchange or invent a protocol. It reads your
          goal, checks the arithmetic, and routes the result through
          infrastructure that already holds real money.
        </p>

        <p className="mt-4 text-xs leading-relaxed text-white/30">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-px rounded-full bg-emerald-400" />
          Live on Sepolia today. The rest are the protocols strategies are
          written against, and are not wired up yet.
        </p>
      </div>
      </section>
  );
}

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

const LEFT: Rail[] = [
  {
    name: "USD₮",
    color: "#26a17b",
    live: true,
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" {...stroke} />
        <path d="M8 9h8M12 9v7" {...stroke} />
      </svg>
    ),
  },
  {
    name: "WDK",
    color: "#38bdf8",
    live: true,
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" {...stroke} />
        <path d="M12 11.5 20 7M12 11.5 4 7M12 11.5V20" {...stroke} />
      </svg>
    ),
  },
  {
    name: "Aave",
    color: "#b6509e",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" {...stroke} />
        <path d="M8 16 12 7l4 9M9.5 13.5h5" {...stroke} />
      </svg>
    ),
  },
];

const RIGHT: Rail[] = [
  {
    name: "Lido",
    color: "#00a3ff",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M12 3.5 5.5 13 12 17l6.5-4z" {...stroke} />
        <path d="M5.5 15.5 12 20.5l6.5-5" {...stroke} />
      </svg>
    ),
  },
  {
    name: "Uniswap",
    color: "#ff007a",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M7 8h10l-3-3M17 16H7l3 3" {...stroke} />
      </svg>
    ),
  },
  {
    name: "MoonPay",
    color: "#7d00ff",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <circle cx="9.5" cy="9.5" r="5" {...stroke} />
        <circle cx="15" cy="15" r="3.5" {...stroke} />
      </svg>
    ),
  },
];

// Fixed geometry so the connector lines land exactly on the tiles. The diagram
// scales as one block rather than reflowing, which would break the alignment.
const W = 340;
const H = 184;
const TILE = 50;
const HUB = 58;
const ROWS = [0, 67, 134];

function Tile({
  rail,
  side,
  top,
  delay,
}: {
  rail: Rail;
  side: "left" | "right";
  top: number;
  delay: number;
}) {
  return (
    <div
      title={rail.name}
      style={{
        color: rail.color,
        top,
        [side]: 0,
        width: TILE,
        height: TILE,
        animationDelay: `${delay}ms`,
      }}
      className="tile-in absolute grid place-items-center rounded-xl border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-0.5 hover:border-white/25"
    >
      {rail.mark}
      {rail.live && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
    </div>
  );
}

/**
 * The rails GoFI runs on, drawn as spokes into GoFI itself.
 *
 * The connector lines are the point: they say GoFI is the thing sitting in the
 * middle of existing infrastructure, not a replacement for any of it.
 */
export function Protocols({ onConnect }: { onConnect?: () => void }) {
  const hubCx = W / 2;
  const hubCy = H / 2;

  const spokes = [
    ...ROWS.map((top) => ({ x: TILE, y: top + TILE / 2 })),
    ...ROWS.map((top) => ({ x: W - TILE, y: top + TILE / 2 })),
  ];

  return (
    <section>
      <div
        className="relative mx-auto"
        style={{ width: W, height: H, maxWidth: "100%" }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full text-white/15"
          aria-hidden
        >
          {spokes.map((spoke, index) => (
            <line
              key={index}
              x1={spoke.x}
              y1={spoke.y}
              x2={hubCx + (spoke.x < hubCx ? -HUB / 2 : HUB / 2)}
              y2={hubCy}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ))}
        </svg>

        {LEFT.map((rail, index) => (
          <Tile
            key={rail.name}
            rail={rail}
            side="left"
            top={ROWS[index]}
            delay={index * 70}
          />
        ))}

        {RIGHT.map((rail, index) => (
          <Tile
            key={rail.name}
            rail={rail}
            side="right"
            top={ROWS[index]}
            delay={210 + index * 70}
          />
        ))}

        <div
          className="tile-in absolute grid place-items-center rounded-2xl border border-spark/40 bg-spark/[0.08] shadow-[0_0_28px_-6px_var(--spark)]"
          style={{
            width: HUB,
            height: HUB,
            top: (H - HUB) / 2,
            left: hubCx - HUB / 2,
            animationDelay: "420ms",
          }}
          title="GoFI"
        >
          <span className="text-sm font-semibold tracking-tight text-spark">
            GoFI
          </span>
        </div>
      </div>

      <div className="mt-10 text-center">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
          Built on rails
          <br />
          you already trust
        </h2>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/50">
          GoFI does not run its own exchange or invent a protocol. It reads your
          goal, checks the arithmetic, and routes the result through
          infrastructure that already holds real money.
        </p>

        <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-white/30">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-px rounded-full bg-emerald-400" />
          Live on Sepolia today. The rest are the protocols strategies are
          written against, and are not wired up yet.
        </p>

        {onConnect && (
          <button
            type="button"
            onClick={onConnect}
            className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-spark/50 hover:text-white"
          >
            Get started
          </button>
        )}
      </div>
    </section>
  );
}

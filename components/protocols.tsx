import type { ReactNode } from "react";

type Protocol = {
  name: string;
  role: string;
  mark: ReactNode;
  live: boolean;
};

/**
 * Marks are drawn here rather than pulled from each project's brand assets:
 * third-party logos carry trademark terms, and a single authored set keeps the
 * row visually consistent at this size.
 */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PROTOCOLS: Protocol[] = [
  {
    name: "USD₮",
    role: "The asset every goal is denominated in",
    live: true,
    mark: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <circle cx="12" cy="12" r="9" {...stroke} />
        <path d="M8 9h8M12 9v7" {...stroke} />
      </svg>
    ),
  },
  {
    name: "WDK",
    role: "Self-custodial wallet and policy engine",
    live: true,
    mark: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" {...stroke} />
        <path d="M12 11.5 20 7M12 11.5 4 7M12 11.5V20" {...stroke} />
      </svg>
    ),
  },
  {
    name: "Aave",
    role: "Lending markets for the stablecoin leg",
    live: false,
    mark: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <circle cx="12" cy="12" r="9" {...stroke} />
        <path d="M8 16 12 7l4 9M9.5 13.5h5" {...stroke} />
      </svg>
    ),
  },
  {
    name: "Lido",
    role: "Liquid staking for the ETH leg",
    live: false,
    mark: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M12 3.5 5.5 13 12 17l6.5-4z" {...stroke} />
        <path d="M5.5 15.5 12 20.5l6.5-5" {...stroke} />
      </svg>
    ),
  },
  {
    name: "Uniswap",
    role: "Swaps between allowed assets",
    live: false,
    mark: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M7 8h10l-3-3M17 16H7l3 3" {...stroke} />
      </svg>
    ),
  },
  {
    name: "MoonPay",
    role: "Fiat on and off ramp",
    live: false,
    mark: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <circle cx="9.5" cy="9.5" r="5" {...stroke} />
        <circle cx="15" cy="15" r="3.5" {...stroke} />
      </svg>
    ),
  },
];

/**
 * The map of what GoFI works across, shown before the flow so a first-time
 * visitor knows what kind of product this is.
 */
export function Protocols() {
  return (
    <section className="mb-12">
      <h2 className="text-xs uppercase tracking-[0.2em] text-white/30">
        The rails GoFI builds on
      </h2>

      <ul className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] sm:grid-cols-3">
        {PROTOCOLS.map((protocol) => (
          <li
            key={protocol.name}
            className="group bg-[#0a0a0d] p-4 transition-colors hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-white/35 transition-colors group-hover:text-spark">
                {protocol.mark}
              </span>
              <span className="text-sm font-medium text-white/80">
                {protocol.name}
              </span>
              {protocol.live && (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400"
                  title="Live on Sepolia"
                />
              )}
            </span>
            <p className="mt-2 text-xs leading-relaxed text-white/35">
              {protocol.role}
            </p>
          </li>
        ))}
      </ul>

      {/*
        One line, stated plainly. Without it the grid reads as six working
        integrations, and the first person who asks to see the Aave call finds
        out otherwise — which costs more than the line does.
      */}
      <p className="mt-3 text-xs text-white/25">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-px rounded-full bg-emerald-400" />
        Live on Sepolia today. The rest are the protocols strategies are written
        against, and are not wired up yet.
      </p>
    </section>
  );
}

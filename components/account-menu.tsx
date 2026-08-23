"use client";

import { useEffect, useRef, useState } from "react";

import type { WalletSnapshot } from "@/lib/wdk/account";

/**
 * A deterministic mark for an address.
 *
 * Derived from the address itself, so the same wallet always produces the same
 * avatar — which is what makes it identity rather than decoration.
 */
function addressAvatar(address: string) {
  let hash = 0;
  for (let i = 2; i < address.length; i += 1) {
    hash = (hash * 31 + address.charCodeAt(i)) % 360;
  }

  return `linear-gradient(135deg, hsl(${hash} 70% 55%), hsl(${(hash + 140) % 360} 75% 45%))`;
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-white/35">{label}</span>
      <span className="font-mono text-xs text-white/80">{value}</span>
    </div>
  );
}

/**
 * The account menu.
 *
 * Session-scoped only: who you are, what you hold, and the way out. The goal
 * history used to live here and no longer does — "how is my goal doing" is the
 * product's second screen, not a line in a dropdown.
 */
export function AccountMenu({
  snapshot,
  goalCount,
  onOpenGoals,
  onDisconnect,
}: {
  snapshot: WalletSnapshot;
  goalCount: number;
  onOpenGoals: () => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!holder.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={holder} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3.5 transition hover:border-white/25"
      >
        <span
          className="h-7 w-7 rounded-full ring-1 ring-white/15"
          style={{ backgroundImage: addressAvatar(snapshot.address) }}
          aria-hidden
        />
        <span className="text-left leading-tight">
          <span className="block font-mono text-xs text-white">
            {short(snapshot.address)}
          </span>
          <span className="block font-mono text-[10px] text-white/35">
            {snapshot.tokens[0]?.formatted ?? "0"} USDT
          </span>
        </span>
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 text-white/30 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="animate-rise absolute right-0 z-30 mt-2 w-[min(92vw,320px)] overflow-hidden rounded-xl border border-white/12 bg-[#0b0b0f] shadow-2xl shadow-black/60">
          <div className="border-b border-white/[0.07] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/30">
              Signed in as
            </p>
            <a
              href={snapshot.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block font-mono text-xs break-all text-white/80 underline decoration-white/15 underline-offset-4 hover:decoration-white/50"
            >
              {snapshot.address}
            </a>
          </div>

          <div className="border-b border-white/[0.07] px-4 py-2">
            <Row label="Network" value={snapshot.network.displayName} />
            <Row
              label="USDT"
              value={`${snapshot.tokens[0]?.formatted ?? "0"}`}
            />
            <Row label="Gas" value={`${snapshot.native.formatted} ETH`} />
          </div>

          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenGoals();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-white/80 transition hover:bg-white/[0.05]"
            >
              Your goals
              <span className="font-mono text-[11px] text-white/30">
                {goalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDisconnect();
              }}
              className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-white/45 transition hover:bg-white/[0.05] hover:text-white/80"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

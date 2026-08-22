"use client";

import { useEffect, useRef, useState } from "react";

import type { GoalHistoryEntry } from "@/lib/supabase/goals";
import type { WalletSnapshot } from "@/lib/wdk/account";
import { GoalHistory } from "./goal-history";

/**
 * A deterministic mark for an address.
 *
 * Derived from the address itself, so the same wallet always produces the same
 * avatar — which is what makes it useful as identity rather than decoration.
 */
function addressAvatar(address: string) {
  let hash = 0;
  for (let i = 2; i < address.length; i += 1) {
    hash = (hash * 31 + address.charCodeAt(i)) % 360;
  }

  const a = hash;
  const b = (hash + 140) % 360;

  return `linear-gradient(135deg, hsl(${a} 70% 55%), hsl(${b} 75% 45%))`;
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function AccountChip({
  snapshot,
  history,
  historyLoading,
  historyError,
  onReloadHistory,
}: {
  snapshot: WalletSnapshot;
  history: GoalHistoryEntry[] | null;
  historyLoading: boolean;
  historyError: string | null;
  onReloadHistory: () => void;
}) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  // A panel that covers content has to be dismissible the two ways people
  // expect: click away, or press Escape.
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

  const executed = (history ?? []).reduce(
    (total, entry) => total + entry.transactions.length,
    0
  );

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
        <div className="animate-rise absolute right-0 z-30 mt-2 w-[min(92vw,460px)] overflow-hidden rounded-xl border border-white/12 bg-[#0b0b0f] shadow-2xl shadow-black/60">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <p className="text-[11px] uppercase tracking-widest text-white/35">
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
            <p className="mt-2 font-mono text-[11px] text-white/35">
              {snapshot.native.formatted} ETH ·{" "}
              {snapshot.tokens[0]?.formatted ?? "0"} USDT ·{" "}
              {snapshot.network.displayName}
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/25">
              {(history ?? []).length} goals · {executed} on-chain{" "}
              {executed === 1 ? "transaction" : "transactions"}
            </p>
          </div>

          <div className="max-h-[58vh] overflow-y-auto px-5 py-4">
            <GoalHistory
              entries={history}
              loading={historyLoading}
              error={historyError}
              onReload={onReloadHistory}
              bare
            />
          </div>
        </div>
      )}
    </div>
  );
}

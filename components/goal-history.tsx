"use client";

import type { GoalHistoryEntry } from "@/lib/supabase/goals";
import type { Feasibility, TransactionStatus } from "@/lib/supabase/types";
import { Badge, Button, Card, ErrorNote, type BadgeTone } from "./ui";

const FEASIBILITY_TONE: Record<Feasibility, BadgeTone> = {
  feasible: "emerald",
  ambitious: "amber",
  unrealistic: "rose",
};

const TX_TONE: Record<TransactionStatus, BadgeTone> = {
  confirmed: "emerald",
  pending: "amber",
  failed: "rose",
};

const EXPLORER = "https://sepolia.etherscan.io/tx/";

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function when(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Entry({ entry }: { entry: GoalHistoryEntry }) {
  // A goal can be analyzed more than once; the newest proposal is the one that
  // describes where it currently stands.
  const strategy = entry.strategies.at(-1);

  return (
    <li className="border-t border-white/[0.07] py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span className="font-mono text-sm text-white">
          {entry.initial_capital} → {entry.target_amount} USDT
        </span>
        <span className="text-xs text-white/35">
          {entry.time_horizon_months} months · {entry.risk_profile}
        </span>

        <span className="ml-auto flex items-center gap-2">
          {strategy && (
            <Badge tone={FEASIBILITY_TONE[strategy.feasibility]}>
              {strategy.feasibility}
            </Badge>
          )}
          <span className="font-mono text-[11px] text-white/25">
            {when(entry.created_at)}
          </span>
        </span>
      </div>

      {entry.transactions.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {entry.transactions.map((transaction) => (
            <li
              key={transaction.hash}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-white/[0.02] px-3 py-2"
            >
              <a
                href={`${EXPLORER}${transaction.hash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-spark/80 underline decoration-spark/20 underline-offset-4 transition hover:decoration-spark"
              >
                {shortHash(transaction.hash)}
              </a>
              <span className="font-mono text-xs text-white/50">
                {transaction.amount} {transaction.asset}
              </span>
              {transaction.block_number && (
                <span className="font-mono text-[11px] text-white/25">
                  block {transaction.block_number.toLocaleString("en-US")}
                </span>
              )}
              <span className="ml-auto">
                <Badge tone={TX_TONE[transaction.status]}>
                  {transaction.status}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-white/25">
          {strategy?.status === "proposed"
            ? "Proposed, not executed."
            : "No transactions yet."}
        </p>
      )}
    </li>
  );
}

/**
 * The track record.
 *
 * Every goal that has been run, the verdict it got, and the transactions it
 * produced — each one linked to the explorer. This is the part a sceptic
 * checks, so it links out rather than asking to be believed.
 */
export function GoalHistory({
  entries,
  loading,
  error,
  onReload,
  bare = false,
}: {
  entries: GoalHistoryEntry[] | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  /** Drop the card chrome when the panel around it already provides one. */
  bare?: boolean;
}) {
  const executed = (entries ?? []).reduce(
    (total, entry) => total + entry.transactions.length,
    0
  );

  const body = (
    <>
      {error && <ErrorNote>{error}</ErrorNote>}

      {!error && entries === null && (
        <p className="text-sm text-white/40">Loading your goals…</p>
      )}

      {!error && entries && entries.length === 0 && (
        <p className="text-sm text-white/40">
          No goals yet. Set one and it will show up here with whatever it
          settled on-chain.
        </p>
      )}

      {!error && entries && entries.length > 0 && (
        <>
          {/* The panel header already carries the counts, so skip them there. */}
          {!bare && (
            <p className="mb-4 text-xs text-white/35">
              {entries.length} {entries.length === 1 ? "goal" : "goals"} ·{" "}
              {executed} on-chain{" "}
              {executed === 1 ? "transaction" : "transactions"}
            </p>
          )}

          <ul>
            {entries.map((entry) => (
              <Entry key={entry.id} entry={entry} />
            ))}
          </ul>
        </>
      )}

      <div className="mt-5">
        <Button variant="ghost" onClick={onReload} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
    </>
  );

  if (bare) return body;

  return (
    <Card title="Track record" step="05">
      {body}
    </Card>
  );
}

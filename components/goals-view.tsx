"use client";

import type { GoalHistoryEntry } from "@/lib/supabase/goals";
import type { Feasibility, TransactionStatus } from "@/lib/supabase/types";
import { Badge, Button, ErrorNote, type BadgeTone } from "./ui";

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

/**
 * How much of the goal's capital has actually reached the position account.
 *
 * This is the only progress figure GoFI can state honestly today. There is no
 * yield feed, so "your balance grew 8%" would be invented — what is real is how
 * much of your own money the agent has deployed, and that is measured from
 * confirmed transactions.
 */
function Deployment({ entry }: { entry: GoalHistoryEntry }) {
  const deployed = entry.transactions
    .filter((transaction) => transaction.status === "confirmed")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const capital = Number(entry.initial_capital);
  const pct = capital > 0 ? Math.min(100, (deployed / capital) * 100) : 0;

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
          Deployed
        </span>
        <span className="font-mono text-xs text-white/70">
          {deployed} <span className="text-white/30">of {capital} USDT</span>
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-spark transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GoalCard({ entry }: { entry: GoalHistoryEntry }) {
  // A goal can be analyzed more than once; the newest proposal describes where
  // it currently stands.
  const strategy = entry.strategies.at(-1);

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span className="font-mono text-base text-white">
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

      {strategy && (
        <p className="mt-3 font-mono text-[11px] text-white/30">
          needs {strategy.required_return_pct}% ·{" "}
          {strategy.monthly_return_pct}% per month
        </p>
      )}

      <Deployment entry={entry} />

      {entry.transactions.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-white/[0.07] pt-4">
          {entry.transactions.map((transaction) => (
            <li
              key={transaction.hash}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
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
        <p className="mt-4 border-t border-white/[0.07] pt-4 text-xs text-white/25">
          {strategy?.status === "proposed"
            ? "Proposed, never executed."
            : "Nothing deployed yet."}
        </p>
      )}
    </li>
  );
}

/**
 * Your goals: what you asked for, what the agent said, and what actually moved.
 *
 * A primary destination rather than a menu item, because "what happened to my
 * goal" is the question a user comes back for.
 */
export function GoalsView({
  entries,
  loading,
  error,
  onReload,
  onNewGoal,
  onBack,
  canGoBack = true,
}: {
  entries: GoalHistoryEntry[] | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onNewGoal: () => void;
  /** Return to whatever the user was doing, without discarding it. */
  onBack: () => void;
  /** False before the first goal, when there is no flow to return to. */
  canGoBack?: boolean;
}) {
  const goals = entries ?? [];
  const executed = goals.reduce(
    (total, entry) => total + entry.transactions.length,
    0
  );

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Your goals
          </h2>
          {entries && (
            <p className="mt-1 font-mono text-xs text-white/30">
              {goals.length} {goals.length === 1 ? "goal" : "goals"} · {executed}{" "}
              on-chain {executed === 1 ? "transaction" : "transactions"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {canGoBack && (
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={onReload} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button variant="shimmer" onClick={onNewGoal}>
            New goal
          </Button>
        </div>
      </header>

      {error && <ErrorNote>{error}</ErrorNote>}

      {!error && entries === null && (
        <p className="text-sm text-white/40">Loading your goals…</p>
      )}

      {!error && entries && goals.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/40">
          No goals yet. Set one and it will show up here with whatever it
          settled on-chain.
        </p>
      )}

      {goals.length > 0 && (
        <ul className="space-y-3">
          {goals.map((entry) => (
            <GoalCard key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}

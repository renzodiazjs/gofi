"use client";

import type { GoalHistoryEntry } from "@/lib/supabase/goals";
import type { Feasibility } from "@/lib/supabase/types";
import { Badge, Button, type BadgeTone } from "./ui";

const FEASIBILITY_TONE: Record<Feasibility, BadgeTone> = {
  feasible: "emerald",
  ambitious: "amber",
  unrealistic: "rose",
};

const EXPLORER = "https://sepolia.etherscan.io/tx/";

/** Whole months since the goal was created, floored. */
function monthsSince(iso: string) {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return Math.floor(days / 30.44);
}

function Meter({
  label,
  value,
  detail,
  pct,
  tone = "spark",
}: {
  label: string;
  value: string;
  detail: string;
  pct: number;
  tone?: "spark" | "quiet";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
          {label}
        </span>
        <span className="font-mono text-xs text-white/70">
          {value} <span className="text-white/30">{detail}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            tone === "spark" ? "bg-spark" : "bg-white/30"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Where an active goal actually stands.
 *
 * Everything here is measured, not modelled: capital that reached the position
 * account, months elapsed against the horizon, and the transactions that got it
 * there. GoFI has no yield feed, so there is no "your balance grew" figure —
 * inventing one on the screen a user checks daily would be the worst possible
 * place to be approximately right.
 */
export function GoalDashboard({
  entry,
  totalGoals,
  onNewGoal,
  onSeeAll,
}: {
  entry: GoalHistoryEntry;
  totalGoals: number;
  onNewGoal: () => void;
  onSeeAll: () => void;
}) {
  const strategy = entry.strategies.at(-1);

  const confirmed = entry.transactions.filter(
    (transaction) => transaction.status === "confirmed"
  );
  const deployed = confirmed.reduce(
    (total, transaction) => total + Number(transaction.amount),
    0
  );

  const capital = Number(entry.initial_capital);
  const elapsed = Math.min(monthsSince(entry.created_at), entry.time_horizon_months);
  const latest = entry.transactions.at(-1);

  return (
    <section>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            Your active goal
          </p>
          <h2 className="mt-2 font-mono text-2xl text-white">
            {entry.initial_capital} <span className="text-white/30">→</span>{" "}
            {entry.target_amount} <span className="text-white/40">USDT</span>
          </h2>
          <p className="mt-1.5 text-xs text-white/35">
            {entry.time_horizon_months} months · {entry.risk_profile}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {totalGoals > 1 && (
            <Button variant="ghost" onClick={onSeeAll}>
              All {totalGoals} goals
            </Button>
          )}
          <Button variant="shimmer" onClick={onNewGoal}>
            New goal
          </Button>
        </div>
      </header>

      <div className="grid gap-5 rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-2">
        <Meter
          label="Deployed"
          value={`${deployed}`}
          detail={`of ${capital} USDT`}
          pct={capital > 0 ? (deployed / capital) * 100 : 0}
        />
        <Meter
          label="Elapsed"
          value={`${elapsed}`}
          detail={`of ${entry.time_horizon_months} months`}
          pct={(elapsed / entry.time_horizon_months) * 100}
          tone="quiet"
        />
      </div>

      {strategy && (
        <div className="mt-5 grid gap-5 rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
              Verdict
            </p>
            <p className="mt-2">
              <Badge tone={FEASIBILITY_TONE[strategy.feasibility]}>
                {strategy.feasibility}
              </Badge>
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
              Needs
            </p>
            <p className="mt-2 font-mono text-sm text-white/85">
              {strategy.required_return_pct}%
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
              Per month
            </p>
            <p className="mt-2 font-mono text-sm text-white/85">
              {strategy.monthly_return_pct}%
            </p>
          </div>
        </div>
      )}

      {strategy && strategy.allocations.length > 0 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
            What the strategy holds
          </p>
          <ul className="mt-4 space-y-2.5">
            {strategy.allocations.map((allocation, index) => (
              <li
                key={`${allocation.asset}-${index}`}
                className="flex flex-wrap items-baseline gap-x-3"
              >
                <span className="font-mono text-sm text-white">
                  {allocation.percentage}% {allocation.asset}
                </span>
                <span className="text-xs text-white/35">
                  {allocation.action}
                </span>
                {allocation.protocol && (
                  <span className="ml-auto font-mono text-[11px] text-white/25">
                    {allocation.protocol}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/*
            Stated on the dashboard, not just in the strategy step. This is the
            screen a user checks repeatedly, and it is where an unqualified
            allocation would quietly become a claim about what they own.
          */}
          <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-white/25">
            Only the USDT legs have moved on-chain. Everything else is a
            recommendation for when the protocol is integrated — GoFI holds no
            ETH position and reports no yield, because it has no feed to measure
            one against.
          </p>
        </div>
      )}

      {latest && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
            Last transaction
          </p>
          <a
            href={`${EXPLORER}${latest.hash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block font-mono text-xs break-all text-spark underline decoration-spark/25 underline-offset-4 hover:decoration-spark"
          >
            {latest.hash}
          </a>
          <p className="mt-2 font-mono text-[11px] text-white/30">
            {latest.amount} {latest.asset}
            {latest.block_number
              ? ` · block ${latest.block_number.toLocaleString("en-US")}`
              : ""}{" "}
            · {latest.status}
          </p>
        </div>
      )}
    </section>
  );
}

"use client";

import type { GoalAnalysis } from "@/lib/ai/goal-analyzer";
import type { Feasibility } from "@/lib/supabase/types";
import type { FinancialGoal } from "@/types";
import { Badge, type BadgeTone } from "./ui";

const TONE: Record<Feasibility, BadgeTone> = {
  feasible: "emerald",
  ambitious: "amber",
  unrealistic: "rose",
};

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/25">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm text-white/85">{value}</dd>
    </div>
  );
}

/**
 * What you asked for, carried through the flow.
 *
 * By the strategy step the numbers you typed are three screens behind you, and
 * a proposal is impossible to judge without them. This keeps the question on
 * screen next to the answer.
 */
export function GoalRecap({
  goal,
  analysis,
  hash,
}: {
  goal: FinancialGoal;
  analysis?: GoalAnalysis;
  hash?: string;
}) {
  return (
    <dl className="mb-5 grid grid-cols-2 gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 sm:grid-cols-4">
      <Cell
        label="Goal"
        value={`${goal.initialCapital} → ${goal.targetAmount}`}
      />
      <Cell label="Horizon" value={`${goal.timeHorizonMonths} months`} />
      <Cell label="Risk" value={goal.riskProfile} />

      {analysis ? (
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/25">
            Verdict
          </dt>
          <dd className="mt-1">
            <Badge tone={TONE[analysis.feasibility]}>
              {analysis.feasibility}
            </Badge>
          </dd>
        </div>
      ) : (
        <Cell label="Verdict" value="—" />
      )}

      {hash && (
        <div className="col-span-2 border-t border-white/[0.07] pt-3 sm:col-span-4">
          <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/25">
            Settled on-chain
          </dt>
          <dd className="mt-1">
            <a
              href={`https://sepolia.etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs break-all text-spark underline decoration-spark/25 underline-offset-4 hover:decoration-spark"
            >
              {hash}
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}

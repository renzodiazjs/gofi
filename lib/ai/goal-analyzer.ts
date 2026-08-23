import type { FinancialGoal, RiskProfile } from "@/types";
import type { Feasibility } from "@/lib/supabase/types";

/**
 * Annualized return each risk profile can realistically target on-chain.
 *
 * Deliberately conservative. These are the numbers stablecoin lending and
 * blue-chip DeFi actually pay, not the ones a landing page promises. GoFI
 * telling a user their goal does not fit is more useful than GoFI agreeing
 * with them and failing six months later.
 */
const REALISTIC_APY_CEILING: Record<RiskProfile, number> = {
  conservative: 8,
  moderate: 20,
  aggressive: 45,
};

export type GoalAnalysis = {
  /** Total return needed over the whole horizon, in percent. */
  requiredReturnPct: number;
  /** Compounded monthly return needed, in percent. */
  monthlyReturnPct: number;
  /** The same target expressed as an APY, for comparison against real yields. */
  annualizedReturnPct: number;
  feasibility: Feasibility;
  ceilingApyPct: number;
  /** Concrete ways to bring an out-of-reach goal back into range. */
  suggestions: string[];
};

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Months needed to reach the target at a given APY. */
function monthsToTarget(growth: number, apyPct: number): number {
  const monthlyRate = (1 + apyPct / 100) ** (1 / 12) - 1;
  return Math.ceil(Math.log(growth) / Math.log(1 + monthlyRate));
}

/** Target reachable within the horizon at a given APY. */
function reachableTarget(
  capital: number,
  months: number,
  apyPct: number
): number {
  return capital * (1 + apyPct / 100) ** (months / 12);
}

/**
 * Pure arithmetic — no model involved.
 *
 * The required return is a compound-interest calculation with one right
 * answer. Handing that to an LLM would mean accepting a plausible-looking
 * wrong number. The model's job starts later, in strategy construction.
 */
export function analyzeGoal(goal: FinancialGoal): GoalAnalysis {
  const { initialCapital, targetAmount, timeHorizonMonths, riskProfile } = goal;

  const growth = targetAmount / initialCapital;
  const requiredReturnPct = (growth - 1) * 100;
  const monthlyReturnPct = (growth ** (1 / timeHorizonMonths) - 1) * 100;
  const annualizedReturnPct = (growth ** (12 / timeHorizonMonths) - 1) * 100;

  const ceiling = REALISTIC_APY_CEILING[riskProfile];

  let feasibility: Feasibility;
  if (annualizedReturnPct <= ceiling) {
    feasibility = "feasible";
  } else if (annualizedReturnPct <= ceiling * 2) {
    feasibility = "ambitious";
  } else {
    feasibility = "unrealistic";
  }

  const suggestions: string[] = [];

  if (feasibility !== "feasible") {
    const months = monthsToTarget(growth, ceiling);
    if (Number.isFinite(months) && months > timeHorizonMonths) {
      suggestions.push(
        `Extend the horizon to about ${months} months to reach ${targetAmount} USDT at ${ceiling}% APY.`
      );
    }

    const reachable = reachableTarget(
      initialCapital,
      timeHorizonMonths,
      ceiling
    );
    suggestions.push(
      `Keep the ${timeHorizonMonths}-month horizon and target about ${round(
        reachable,
        2
      )} USDT instead.`
    );

    const profiles: RiskProfile[] = ["conservative", "moderate", "aggressive"];
    const better = profiles.find(
      (profile) => REALISTIC_APY_CEILING[profile] >= annualizedReturnPct
    );
    if (better && better !== riskProfile) {
      suggestions.push(
        `A ${better} profile would cover this target, at materially higher risk of loss.`
      );
    }
  }

  return {
    requiredReturnPct: round(requiredReturnPct),
    monthlyReturnPct: round(monthlyReturnPct),
    annualizedReturnPct: round(annualizedReturnPct),
    feasibility,
    ceilingApyPct: ceiling,
    suggestions,
  };
}

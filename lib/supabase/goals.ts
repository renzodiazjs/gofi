import "server-only";

import { DEFAULT_GUARDRAILS } from "@/lib/guardrails/config";
import type { FinancialGoal } from "@/types";
import type { GoalAnalysis } from "@/lib/ai/goal-analyzer";
import type { StrategyOutput } from "@/lib/ai/strategy-builder";
import { getSupabase } from "./server";
import {
  toGuardrailsInsert,
  type GoalRow,
  type GuardrailsRow,
  type StrategyRow,
  type TransactionRow,
} from "./types";

/** Surfaces the "you forgot to run the migration" case as a readable error. */
function fail(scope: string, error: { message: string; code?: string }): never {
  if (error.code === "42P01" || /does not exist/i.test(error.message)) {
    throw new Error(
      `${scope}: the GoFI tables are missing. Run supabase/migrations/0001_init.sql in the Supabase SQL editor.`
    );
  }
  throw new Error(`${scope}: ${error.message}`);
}

export async function createGoal(
  goal: FinancialGoal,
  walletAddress: string
): Promise<GoalRow> {
  const { data, error } = await getSupabase()
    .from("goals")
    .insert({
      wallet_address: walletAddress,
      initial_capital: goal.initialCapital,
      target_amount: goal.targetAmount,
      time_horizon_months: goal.timeHorizonMonths,
      risk_profile: goal.riskProfile,
      status: "analyzed",
    })
    .select()
    .single();

  if (error) fail("createGoal", error);

  const guardrails = await getSupabase()
    .from("guardrails")
    .insert(toGuardrailsInsert(data.id, DEFAULT_GUARDRAILS));

  if (guardrails.error) fail("createGoal.guardrails", guardrails.error);

  return data as GoalRow;
}

export async function createStrategy(
  goalId: number,
  analysis: GoalAnalysis,
  strategy: StrategyOutput
): Promise<StrategyRow> {
  const { data, error } = await getSupabase()
    .from("strategies")
    .insert({
      goal_id: goalId,
      required_return_pct: analysis.requiredReturnPct,
      monthly_return_pct: analysis.monthlyReturnPct,
      feasibility: analysis.feasibility,
      confidence: strategy.confidence,
      reasoning: strategy.reasoning,
      allocations: strategy.allocations,
      model: strategy.model,
      status: "proposed",
    })
    .select()
    .single();

  if (error) fail("createStrategy", error);

  return data as StrategyRow;
}

export async function listGoals(): Promise<GoalRow[]> {
  const { data, error } = await getSupabase()
    .from("goals")
    .select()
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) fail("listGoals", error);

  return (data ?? []) as GoalRow[];
}

export type RecordTransactionInput = {
  goalId: number | null;
  strategyId: number | null;
  hash: string;
  network: string;
  chainId: number;
  sender: string;
  recipient: string;
  asset: string;
  amount: number;
  amountBaseUnits: string;
  fee: number;
  feeSymbol: string;
};

export async function recordTransaction(
  input: RecordTransactionInput
): Promise<TransactionRow> {
  const { data, error } = await getSupabase()
    .from("transactions")
    .insert({
      goal_id: input.goalId,
      strategy_id: input.strategyId,
      hash: input.hash,
      network: input.network,
      chain_id: input.chainId,
      sender: input.sender,
      recipient: input.recipient,
      asset: input.asset,
      amount: input.amount,
      amount_base_units: input.amountBaseUnits,
      fee: input.fee,
      fee_symbol: input.feeSymbol,
      status: "pending",
    })
    .select()
    .single();

  if (error) fail("recordTransaction", error);

  return data as TransactionRow;
}

export async function getStrategyWithGoal(
  strategyId: number
): Promise<{ strategy: StrategyRow; goal: GoalRow; guardrails: GuardrailsRow }> {
  const supabase = getSupabase();

  const strategy = await supabase
    .from("strategies")
    .select()
    .eq("id", strategyId)
    .single();

  if (strategy.error) fail("getStrategy", strategy.error);

  const goal = await supabase
    .from("goals")
    .select()
    .eq("id", strategy.data.goal_id)
    .single();

  if (goal.error) fail("getStrategy.goal", goal.error);

  const guardrails = await supabase
    .from("guardrails")
    .select()
    .eq("goal_id", strategy.data.goal_id)
    .single();

  if (guardrails.error) fail("getStrategy.guardrails", guardrails.error);

  return {
    strategy: strategy.data as StrategyRow,
    goal: goal.data as GoalRow,
    guardrails: guardrails.data as GuardrailsRow,
  };
}

export async function setStrategyStatus(
  strategyId: number,
  status: StrategyRow["status"]
): Promise<void> {
  const { error } = await getSupabase()
    .from("strategies")
    .update({ status })
    .eq("id", strategyId);

  if (error) fail("setStrategyStatus", error);
}

export async function setGoalStatus(
  goalId: number,
  status: GoalRow["status"]
): Promise<void> {
  const { error } = await getSupabase()
    .from("goals")
    .update({ status })
    .eq("id", goalId);

  if (error) fail("setGoalStatus", error);
}

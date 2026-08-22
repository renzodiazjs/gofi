import type { Guardrails, RiskProfile } from "@/types";

export type GoalStatus =
  | "draft"
  | "analyzed"
  | "approved"
  | "active"
  | "completed"
  | "abandoned";

export type Feasibility = "feasible" | "ambitious" | "unrealistic";
export type Confidence = "low" | "medium" | "high";
export type StrategyStatus = "proposed" | "approved" | "rejected" | "executed";
export type TransactionStatus = "pending" | "confirmed" | "failed";

export type GoalRow = {
  id: number;
  created_at: string;
  updated_at: string;
  wallet_address: string;
  initial_capital: number;
  target_amount: number;
  time_horizon_months: number;
  risk_profile: RiskProfile;
  status: GoalStatus;
};

/** One step of a proposed strategy. Stored as jsonb on `strategies`. */
export type Allocation = {
  asset: string;
  protocol: string | null;
  action: string;
  percentage: number;
  expectedApyPct: number | null;
  rationale: string;
};

export type StrategyRow = {
  id: number;
  created_at: string;
  goal_id: number;
  required_return_pct: number;
  monthly_return_pct: number;
  feasibility: Feasibility;
  confidence: Confidence;
  reasoning: string;
  allocations: Allocation[];
  model: string;
  status: StrategyStatus;
};

export type GuardrailsRow = {
  id: number;
  created_at: string;
  goal_id: number;
  max_transaction_usd: number;
  max_daily_volume_usd: number;
  allowed_assets: string[];
  allowed_protocols: string[];
  require_confirmation: boolean;
};

export type TransactionRow = {
  id: number;
  created_at: string;
  goal_id: number | null;
  strategy_id: number | null;
  hash: string;
  network: string;
  chain_id: number;
  sender: string;
  recipient: string;
  asset: string;
  amount: number;
  amount_base_units: string;
  fee: number;
  fee_symbol: string;
  status: TransactionStatus;
  block_number: number | null;
  confirmed_at: string | null;
  failure_reason: string | null;
};

export type GuardrailsInsert = Omit<GuardrailsRow, "id" | "created_at"> & {
  goal_id: number;
};

export function toGuardrailsInsert(
  goalId: number,
  guardrails: Guardrails
): GuardrailsInsert {
  return {
    goal_id: goalId,
    max_transaction_usd: guardrails.maxTransactionUsd,
    max_daily_volume_usd: guardrails.maxDailyVolumeUsd,
    allowed_assets: guardrails.allowedAssets,
    allowed_protocols: guardrails.allowedProtocols,
    require_confirmation: guardrails.requireConfirmation,
  };
}

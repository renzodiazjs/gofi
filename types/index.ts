export type RiskProfile = "conservative" | "moderate" | "aggressive";

/** User-defined financial goal. Consumed by the GoFI agent (BLOCK 4). */
export type FinancialGoal = {
  initialCapital: number;
  targetAmount: number;
  timeHorizonMonths: number;
  riskProfile: RiskProfile;
};

/** Hard limits the agent can never exceed. Enforced in lib/guardrails. */
export type Guardrails = {
  maxTransactionUsd: number;
  maxDailyVolumeUsd: number;
  allowedAssets: string[];
  allowedProtocols: string[];
  requireConfirmation: boolean;
};

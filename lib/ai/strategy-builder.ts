import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import { DEFAULT_GUARDRAILS } from "@/lib/guardrails/config";
import type { Allocation, Confidence } from "@/lib/supabase/types";
import type { FinancialGoal } from "@/types";
import type { GoalAnalysis } from "./goal-analyzer";

export const MODEL = "claude-opus-5";

const allocationSchema = z.object({
  asset: z.string(),
  protocol: z.string().nullable(),
  action: z.string(),
  percentage: z.number(),
  expectedApyPct: z.number().nullable(),
  rationale: z.string(),
});

const strategyOutputSchema = z.object({
  allocations: z.array(allocationSchema),
  reasoning: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

export type StrategyOutput = {
  allocations: Allocation[];
  reasoning: string;
  confidence: Confidence;
  model: string;
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * The model is told exactly what GoFI can and cannot do today. Without this it
 * invents protocols and yields that do not exist on our network, which would be
 * worse than useless — it would be a strategy nobody can execute.
 */
const SYSTEM_PROMPT = `You are the strategy engine of GoFI, a goal-based on-chain finance agent.

You turn a validated financial goal into an allocation proposal. You do not compute the required return — that arithmetic is already done and given to you. Do not recontradict it.

HARD CONSTRAINTS ON WHAT CAN ACTUALLY EXECUTE TODAY:
- Network: Ethereum Sepolia testnet only. No mainnet.
- Executable assets: USDT and native ETH. Nothing else.
- No lending, swap, or bridge protocol is integrated yet. Any protocol you name is a FORWARD-LOOKING recommendation, not something the agent can execute now. Say so in the rationale.
- No live market or yield data is connected. Any APY you give is an illustrative estimate. State the assumption; never present it as an observed rate.
- Per-transaction caps are enforced in the wallet layer and cannot be exceeded.

RULES:
- Allocation percentages must sum to 100.
- If the analysis says the goal is unrealistic, say so plainly in the reasoning and propose the most defensible conservative allocation anyway. Do not invent yields to make the numbers work.
- When suggesting alternatives (longer horizon, lower target, different risk profile), use ONLY the pre-computed alternatives given to you, verbatim. Never derive your own horizon or target figures — the user would then see two different numbers for the same question.
- Confidence reflects how well the proposal matches the goal, and must be "low" when feasibility is "unrealistic".
- Be concrete and brief. No hedging boilerplate, no disclaimers beyond the assumptions above.`;

export async function buildStrategy(
  goal: FinancialGoal,
  analysis: GoalAnalysis
): Promise<StrategyOutput> {
  // Alternatives are computed, not generated. If the model derived its own
  // "extend to N months" figure it would disagree with the analyzer, and the
  // user would see two different answers to the same question.
  const alternatives = analysis.suggestions.length
    ? "\n\nPRE-COMPUTED ALTERNATIVES (quote these verbatim — do not derive your own numbers)\n" +
      analysis.suggestions.map((suggestion) => `- ${suggestion}`).join("\n")
    : "";

  const prompt = `GOAL
Initial capital:  ${goal.initialCapital} USDT
Target amount:    ${goal.targetAmount} USDT
Time horizon:     ${goal.timeHorizonMonths} months
Risk profile:     ${goal.riskProfile}

ANALYSIS (already computed, treat as ground truth)
Required total return:  ${analysis.requiredReturnPct}%
Required monthly:       ${analysis.monthlyReturnPct}%
Equivalent APY:         ${analysis.annualizedReturnPct}%
Realistic APY ceiling for a ${goal.riskProfile} profile: ${analysis.ceilingApyPct}%
Feasibility verdict:    ${analysis.feasibility}${alternatives}

GUARDRAILS ENFORCED IN THE WALLET LAYER
Max per transaction:  ${DEFAULT_GUARDRAILS.maxTransactionUsd} USD
Max daily volume:     ${DEFAULT_GUARDRAILS.maxDailyVolumeUsd} USD
Allowed assets:       ${DEFAULT_GUARDRAILS.allowedAssets.join(", ")}
User confirmation:    ${DEFAULT_GUARDRAILS.requireConfirmation ? "required" : "not required"}

Produce the allocation proposal.`;

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(strategyOutputSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const parsed = response.parsed_output;

  if (!parsed) {
    throw new Error("The strategy model returned no parseable output.");
  }

  return {
    allocations: parsed.allocations,
    reasoning: parsed.reasoning,
    confidence: parsed.confidence,
    model: MODEL,
  };
}

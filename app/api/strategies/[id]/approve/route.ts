import { PolicyViolationError } from "@tetherto/wdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_GUARDRAILS } from "@/lib/guardrails/config";
import {
  InvalidTicketError,
  issueTicket,
  verifyTicket,
} from "@/lib/security/quote-ticket";
import {
  getStrategyWithGoal,
  recordTransaction,
  setGoalStatus,
  setStrategyStatus,
} from "@/lib/supabase/goals";
import { getWalletSnapshot } from "@/lib/wdk/account";
import { NETWORKS, SEPOLIA } from "@/lib/wdk/networks";
import { quoteUsdtTransfer, sendUsdtTransfer } from "@/lib/wdk/transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** Where the allocated capital is moved to. */
  positionAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "positionAddress must be a 0x EVM address."),
  confirm: z.boolean().default(false),
  /** The ticket returned with the quote. Required to execute. */
  ticket: z.string().optional(),
});

/**
 * Approve a proposed strategy and fund its first executable step.
 *
 * What "executable" means today is narrow and worth stating plainly: no
 * lending, swap, or bridge protocol is integrated, so the only real on-chain
 * action available is moving the USDT allocation into the position account.
 * That is what this endpoint does — a real transfer, through the real policy
 * engine, producing a real hash. It does not simulate a yield position.
 *
 * Nothing is signed until `confirm` is true. The unconfirmed call returns the
 * quote for the user to approve, which is the `requireConfirmation` guardrail
 * expressed as an API contract.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const strategyId = Number((await params).id);

  if (!Number.isInteger(strategyId) || strategyId <= 0) {
    return NextResponse.json({ error: "Invalid strategy id." }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { positionAddress, confirm, ticket } = parsed.data;

  try {
    const { strategy, goal } = await getStrategyWithGoal(strategyId);

    if (strategy.status === "executed") {
      return NextResponse.json(
        { error: "This strategy has already been executed." },
        { status: 409 }
      );
    }

    const usdtLeg = strategy.allocations.find(
      (allocation) => allocation.asset.toUpperCase() === "USDT"
    );

    if (!usdtLeg) {
      return NextResponse.json(
        { error: "This strategy has no USDT allocation to execute." },
        { status: 422 }
      );
    }

    // Size the first step by the allocation, then clamp it to the per
    // transaction cap. The wallet-layer policy would reject an over-cap
    // transfer anyway; clamping turns that into a plan rather than an error.
    //
    // The cap is read from the same constant the WDK policy compiles from, not
    // from the goal's guardrails row. Two sources would let the plan promise a
    // limit the wallet does not actually enforce; the stored row is the record
    // of what was in force when the goal was created, not a control input.
    const cap = DEFAULT_GUARDRAILS.maxTransactionUsd;
    const allocated = (goal.initial_capital * usdtLeg.percentage) / 100;
    const amount = Math.min(allocated, cap);
    const tranches = Math.ceil(allocated / cap);

    const plan = {
      allocationPct: usdtLeg.percentage,
      allocatedUsdt: Number(allocated.toFixed(6)),
      thisTransferUsdt: Number(amount.toFixed(6)),
      tranchesRequired: tranches,
      dailyCapUsdt: DEFAULT_GUARDRAILS.maxDailyVolumeUsd,
      cappedBy: allocated > cap ? "max_transaction_usd" : null,
    };

    const amountString = amount.toFixed(6);

    // Check funding before quoting. Without this the RPC returns a raw
    // "ERC20: transfer amount exceeds balance" revert dump, which tells the
    // user nothing about what to do next.
    const snapshot = await getWalletSnapshot();
    const availableUsdt = Number(
      snapshot.tokens.find((token) => token.symbol === "USDT")?.formatted ?? "0"
    );

    if (availableUsdt < amount) {
      return NextResponse.json(
        {
          error: `Insufficient USDT: this step needs ${amountString} but the wallet holds ${availableUsdt}.`,
          plan,
          available: { asset: "USDT", balance: availableUsdt },
        },
        { status: 422 }
      );
    }

    // The claims are derived here, on both paths, from the strategy and the
    // guardrails — never from the request body. That is what makes the ticket
    // binding: a client cannot quote one amount and execute another, because
    // the amount it would have to sign for is not its to choose.
    const claims = {
      scope: `strategy:${strategy.id}`,
      recipient: positionAddress,
      asset: "USDT",
      amount: amountString,
    };

    if (!confirm) {
      return NextResponse.json({
        status: "awaiting_confirmation",
        plan,
        quote: await quoteUsdtTransfer({ to: positionAddress, amount: amountString }),
        ticket: issueTicket(claims),
      });
    }

    // Past this line the wallet signs. The confirmation is only meaningful if
    // it refers to a quote this server actually issued, so an unverifiable
    // ticket stops here rather than at the policy engine.
    verifyTicket(ticket, claims);

    const receipt = await sendUsdtTransfer({
      to: positionAddress,
      amount: amountString,
    });

    await recordTransaction({
      goalId: goal.id,
      strategyId: strategy.id,
      hash: receipt.hash,
      network: SEPOLIA,
      chainId: NETWORKS[SEPOLIA].chainId,
      sender: snapshot.address,
      recipient: positionAddress,
      asset: receipt.token,
      amount: Number(receipt.amount),
      amountBaseUnits: receipt.amountBaseUnits,
      fee: Number(receipt.fee),
      feeSymbol: receipt.feeSymbol,
    });

    await setStrategyStatus(strategy.id, "executed");
    await setGoalStatus(goal.id, "active");

    return NextResponse.json({ status: "executed", plan, receipt });
  } catch (error) {
    if (error instanceof InvalidTicketError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof PolicyViolationError) {
      return NextResponse.json(
        {
          error: error.reason,
          blockedBy: { policyId: error.policyId, ruleName: error.ruleName },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Approval failed." },
      { status: 500 }
    );
  }
}

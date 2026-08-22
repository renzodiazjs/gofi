import { NextResponse } from "next/server";

import {
  applyConfirmation,
  getTransactionByHash,
} from "@/lib/supabase/goals";
import { getChainOutcome } from "@/lib/wdk/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reconcile one transaction against the chain.
 *
 * The write path records a hash the moment it is broadcast, which is before it
 * is mined — so the row is honestly `pending` until something checks. This is
 * that something. It is safe to call repeatedly: a settled row simply gets the
 * same values written again.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;

  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    return NextResponse.json(
      { error: "Invalid transaction hash." },
      { status: 400 }
    );
  }

  try {
    const existing = await getTransactionByHash(hash);

    if (!existing) {
      return NextResponse.json(
        { error: "Transaction not found in the GoFI ledger." },
        { status: 404 }
      );
    }

    if (existing.status !== "pending") {
      return NextResponse.json({ transaction: existing, checked: false });
    }

    const outcome = await getChainOutcome(hash);
    const updated = await applyConfirmation(hash, {
      status: outcome.status,
      blockNumber: outcome.blockNumber,
      failureReason: outcome.failureReason,
    });

    return NextResponse.json({
      transaction: updated,
      checked: true,
      finality: outcome.finality,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to check the chain.",
      },
      { status: 500 }
    );
  }
}

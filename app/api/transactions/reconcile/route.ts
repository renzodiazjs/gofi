import { NextResponse } from "next/server";

import {
  applyConfirmation,
  listPendingTransactions,
} from "@/lib/supabase/goals";
import { getChainOutcome } from "@/lib/wdk/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sweep every still-pending transaction and settle what the chain has decided.
 *
 * Per-transaction failures are collected rather than thrown: one unreachable
 * hash must not stop the rest of the ledger from reconciling.
 */
export async function POST() {
  try {
    const pending = await listPendingTransactions();

    const results = await Promise.all(
      pending.map(async (transaction) => {
        try {
          const outcome = await getChainOutcome(transaction.hash);

          if (outcome.status === "pending") {
            return { hash: transaction.hash, status: "pending" as const };
          }

          await applyConfirmation(transaction.hash, {
            status: outcome.status,
            blockNumber: outcome.blockNumber,
            failureReason: outcome.failureReason,
          });

          return {
            hash: transaction.hash,
            status: outcome.status,
            blockNumber: outcome.blockNumber,
          };
        } catch (error) {
          return {
            hash: transaction.hash,
            status: "error" as const,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    return NextResponse.json({
      scanned: pending.length,
      settled: results.filter(
        (result) => result.status === "confirmed" || result.status === "failed"
      ).length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Reconciliation failed.",
      },
      { status: 500 }
    );
  }
}

"use client";

import { useState } from "react";

import type { StrategyRow } from "@/lib/supabase/types";
import { Badge, Button, Card, ErrorNote, Field } from "./ui";

type Plan = {
  allocationPct: number;
  allocatedUsdt: number;
  thisTransferUsdt: number;
  tranchesRequired: number;
  cappedBy: string | null;
};

type Quote = {
  token: string;
  recipient: string;
  amount: string;
  fee: string;
  feeSymbol: string;
};

type Receipt = Quote & { hash: string; explorerUrl: string };

type Confirmation = {
  status: "pending" | "confirmed" | "failed";
  blockNumber: number | null;
  failureReason: string | null;
};

type State =
  | { phase: "idle" }
  | { phase: "quoting" }
  | { phase: "quoted"; plan: Plan; quote: Quote }
  | { phase: "executing"; plan: Plan; quote: Quote }
  | {
      phase: "executed";
      plan: Plan;
      receipt: Receipt;
      confirmation: Confirmation;
    };

export function ApprovalCard({
  strategy,
  positionAddress,
  onExecuted,
}: {
  strategy: StrategyRow;
  positionAddress: string;
  onExecuted: () => void;
}) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  /**
   * A broadcast hash is not a mined transaction. Poll the ledger endpoint,
   * which reconciles against the chain, until the row stops being pending.
   *
   * Polling lives inside the async flow rather than an effect: the request that
   * produced the hash is the only thing that needs to watch it, and an effect
   * would set state during render.
   */
  async function trackConfirmation(plan: Plan, receipt: Receipt) {
    const deadline = Date.now() + 120_000;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));

      try {
        const response = await fetch(`/api/transactions/${receipt.hash}`);
        if (!response.ok) continue;

        const payload = await response.json();
        const row = payload.transaction;

        if (row?.status && row.status !== "pending") {
          setState({
            phase: "executed",
            plan,
            receipt,
            confirmation: {
              status: row.status,
              blockNumber: row.block_number ?? null,
              failureReason: row.failure_reason ?? null,
            },
          });
          onExecuted();
          return;
        }
      } catch {
        // Transient network failure — keep polling until the deadline.
      }
    }
  }

  async function call(confirm: boolean) {
    setError(null);
    setBlockedBy(null);

    try {
      const response = await fetch(`/api/strategies/${strategy.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionAddress, confirm }),
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload.blockedBy) {
          setBlockedBy(
            `${payload.blockedBy.policyId} · ${payload.blockedBy.ruleName}`
          );
        }
        throw new Error(payload.error ?? "Request failed");
      }

      if (confirm) {
        setState({
          phase: "executed",
          plan: payload.plan,
          receipt: payload.receipt,
          confirmation: {
            status: "pending",
            blockNumber: null,
            failureReason: null,
          },
        });
        onExecuted();
        void trackConfirmation(payload.plan, payload.receipt);
      } else {
        setState({ phase: "quoted", plan: payload.plan, quote: payload.quote });
      }
    } catch (caught) {
      setState({ phase: "idle" });
      setError(caught instanceof Error ? caught.message : "Unknown error");
    }
  }

  const busy = state.phase === "quoting" || state.phase === "executing";

  return (
    <Card title="Approval & execution" step="04">
      <p className="mb-5 text-sm text-white/50">
        Nothing is signed until you confirm. The quote below is produced by the
        wallet layer without touching your keys.
      </p>

      <dl className="mb-5">
        <Field label="Position account" value={positionAddress} />
      </dl>

      {state.phase === "idle" && (
        <Button
          onClick={() => {
            setState({ phase: "quoting" });
            void call(false);
          }}
          disabled={busy}
        >
          Preview transaction
        </Button>
      )}

      {state.phase === "quoting" && <Button disabled>Pricing…</Button>}

      {(state.phase === "quoted" || state.phase === "executing") && (
        <div className="space-y-5">
          <dl className="rounded-lg border border-white/[0.07] bg-black/30 p-4">
            <Field
              label="Allocation"
              value={`${state.plan.allocationPct}% → ${state.plan.allocatedUsdt} USDT`}
            />
            <Field
              label="This transaction"
              value={`${state.quote.amount} ${state.quote.token}`}
            />
            <Field
              label="Network fee"
              value={`${state.quote.fee} ${state.quote.feeSymbol}`}
            />
            {state.plan.cappedBy && (
              <Field
                label="Guardrail"
                value={
                  <span className="text-amber-300">
                    capped by {state.plan.cappedBy} · {state.plan.tranchesRequired}{" "}
                    tranches required
                  </span>
                }
              />
            )}
          </dl>

          <div className="flex gap-3">
            <Button
              variant="shimmer"
              onClick={() => {
                setState({ ...state, phase: "executing" });
                void call(true);
              }}
              disabled={busy}
            >
              {state.phase === "executing" ? "Signing…" : "Confirm & execute"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setState({ phase: "idle" })}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {state.phase === "executed" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="emerald">broadcast</Badge>
            {state.confirmation.status === "pending" && (
              <Badge tone="amber">waiting for a block…</Badge>
            )}
            {state.confirmation.status === "confirmed" && (
              <Badge tone="emerald">
                confirmed in block {state.confirmation.blockNumber}
              </Badge>
            )}
            {state.confirmation.status === "failed" && (
              <Badge tone="rose">failed on-chain</Badge>
            )}
          </div>

          {state.confirmation.failureReason && (
            <ErrorNote>{state.confirmation.failureReason}</ErrorNote>
          )}

          <dl className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
            <Field
              label="Amount"
              value={`${state.receipt.amount} ${state.receipt.token}`}
            />
            <Field
              label="Fee"
              value={`${state.receipt.fee} ${state.receipt.feeSymbol}`}
            />
            <Field
              label="Transaction"
              value={
                <a
                  href={state.receipt.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-emerald-400/40 underline-offset-4 hover:decoration-emerald-400"
                >
                  {state.receipt.hash}
                </a>
              }
            />
          </dl>
        </div>
      )}

      {error && (
        <div className="mt-5 space-y-2">
          <ErrorNote>{error}</ErrorNote>
          {blockedBy && (
            <p className="font-mono text-xs text-rose-300/60">
              blocked by policy: {blockedBy}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

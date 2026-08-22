"use client";

import { useCallback, useState } from "react";

import type { GoalAnalysis } from "@/lib/ai/goal-analyzer";
import type { GoalRow, StrategyRow } from "@/lib/supabase/types";
import type { WalletSnapshot } from "@/lib/wdk/account";
import { ApprovalCard } from "./approval-card";
import { GoalForm, type GoalDraft } from "./goal-form";
import { AnalysisCard, StrategyCard } from "./strategy-view";
import { WalletCard } from "./wallet-card";

type Proposal = {
  goal: GoalRow;
  analysis: GoalAnalysis;
  strategy: StrategyRow;
};

export function GofiApp() {
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);

    try {
      const response = await fetch("/api/wallet");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Request failed");
      setWallet(payload as WalletSnapshot);
    } catch (caught) {
      setWalletError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setWalletLoading(false);
    }
  }, []);

  async function analyze(draft: GoalDraft) {
    setBusy(true);
    setError(null);
    setProposal(null);

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "Request failed");

      setProposal(payload as Proposal);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <WalletCard
        snapshot={wallet}
        loading={walletLoading}
        error={walletError}
        onLoad={loadWallet}
      />

      <GoalForm onSubmit={analyze} busy={busy} error={error} />

      {proposal && (
        <>
          <AnalysisCard analysis={proposal.analysis} />
          <StrategyCard strategy={proposal.strategy} />

          {wallet ? (
            <ApprovalCard
              strategy={proposal.strategy}
              positionAddress={wallet.positionAddress}
              onExecuted={loadWallet}
            />
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/40">
              Initialize the wallet to approve and execute this strategy.
            </p>
          )}
        </>
      )}
    </div>
  );
}

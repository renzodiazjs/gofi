"use client";

import { useCallback, useEffect, useState } from "react";

import type { GoalAnalysis } from "@/lib/ai/goal-analyzer";
import type { GoalHistoryEntry } from "@/lib/supabase/goals";
import type { GoalRow, StrategyRow } from "@/lib/supabase/types";
import type { WalletSnapshot } from "@/lib/wdk/account";
import { ApprovalCard } from "./approval-card";
import { GoalForm, type GoalDraft } from "./goal-form";
import { GoalHistory } from "./goal-history";
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

  const [history, setHistory] = useState<GoalHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await fetch("/api/goals");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Request failed");
      setHistory(payload.goals as GoalHistoryEntry[]);
    } catch (caught) {
      setHistoryError(
        caught instanceof Error ? caught.message : "Unknown error"
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // The track record is worth showing before the visitor does anything, so it
  // loads on arrival. The first state write happens after the request resolves,
  // never synchronously inside the effect.
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const response = await fetch("/api/goals");
        const payload = await response.json();
        if (!alive) return;

        if (!response.ok) throw new Error(payload.error ?? "Request failed");
        setHistory(payload.goals as GoalHistoryEntry[]);
      } catch (caught) {
        if (!alive) return;
        setHistoryError(
          caught instanceof Error ? caught.message : "Unknown error"
        );
      }
    })();

    return () => {
      alive = false;
    };
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
      void loadHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  const afterExecution = useCallback(() => {
    void loadWallet();
    void loadHistory();
  }, [loadWallet, loadHistory]);

  return (
    <div className="space-y-5">
      <WalletCard
        snapshot={wallet}
        loading={walletLoading}
        error={walletError}
        onLoad={loadWallet}
      />

      <div id="goal" className="scroll-mt-8">
        <GoalForm onSubmit={analyze} busy={busy} error={error} />
      </div>

      {proposal && (
        <>
          <AnalysisCard analysis={proposal.analysis} />
          <StrategyCard strategy={proposal.strategy} />

          {wallet ? (
            <ApprovalCard
              strategy={proposal.strategy}
              positionAddress={wallet.positionAddress}
              onExecuted={afterExecution}
            />
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/40">
              Initialize the wallet to approve and execute this strategy.
            </p>
          )}
        </>
      )}

      <GoalHistory
        entries={history}
        loading={historyLoading}
        error={historyError}
        onReload={loadHistory}
      />
    </div>
  );
}

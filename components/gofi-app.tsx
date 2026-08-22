"use client";

import { useCallback, useEffect, useState } from "react";

import type { GoalAnalysis } from "@/lib/ai/goal-analyzer";
import type { GoalHistoryEntry } from "@/lib/supabase/goals";
import type { GoalRow, StrategyRow } from "@/lib/supabase/types";
import type { WalletSnapshot } from "@/lib/wdk/account";
import { AccountChip } from "./account-chip";
import { ApprovalCard } from "./approval-card";
import { GoalForm, type GoalDraft } from "./goal-form";
import { Protocols } from "./protocols";
import { AnalysisCard, StrategyCard } from "./strategy-view";
import { WalletCard } from "./wallet-card";

type Proposal = {
  goal: GoalRow;
  analysis: GoalAnalysis;
  strategy: StrategyRow;
};

type Step = "wallet" | "goal" | "feasibility" | "strategy" | "approval";

export function GofiApp() {
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("wallet");

  const [history, setHistory] = useState<GoalHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  /**
   * Connecting is the sign-in. A successful connect moves straight to the goal
   * step: once the balances are in there is nothing left to do on the wallet
   * screen, and a second click for that is friction with no payoff.
   */
  const connect = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);

    try {
      const response = await fetch("/api/wallet");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Request failed");

      setWallet(payload as WalletSnapshot);
      setStep("goal");
      void loadHistory();
    } catch (caught) {
      setWalletError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setWalletLoading(false);
    }
  }, [loadHistory]);

  /** Refresh balances without moving the user out of wherever they are. */
  const refreshWallet = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet");
      const payload = await response.json();
      if (response.ok) setWallet(payload as WalletSnapshot);
    } catch {
      // A failed background refresh keeps the last known balances on screen.
    }
  }, []);

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
      setStep("feasibility");
      void loadHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  const afterExecution = useCallback(() => {
    void refreshWallet();
    void loadHistory();
  }, [refreshWallet, loadHistory]);

  return (
    <>
      <header className="mb-14 flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="gradient-text text-3xl font-semibold tracking-tight">
              GoFI
            </h1>
            <span className="text-xs uppercase tracking-[0.2em] text-white/30">
              Goal Finance
            </span>
          </div>
          <p className="mt-4 text-lg text-white/60">
            Turn financial goals into on-chain strategies.
          </p>
        </div>

        {/*
          The address is the account, so the track record hangs off it: it is
          that wallet's history, not a step in the flow.
        */}
        {wallet && (
          <AccountChip
            snapshot={wallet}
            history={history}
            historyLoading={historyLoading}
            historyError={historyError}
            onReloadHistory={loadHistory}
          />
        )}
      </header>

      {step === "wallet" ? (
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_340px]">
          <Protocols />

          <WalletCard
            snapshot={wallet}
            loading={walletLoading}
            error={walletError}
            onLoad={connect}
            canContinue={wallet !== null}
            onContinue={() => setStep("goal")}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {step === "goal" && (
            <div id="goal" className="scroll-mt-8">
              <GoalForm
                onSubmit={analyze}
                onBack={() => setStep("wallet")}
                busy={busy}
                error={error}
              />
            </div>
          )}

          {step === "feasibility" && proposal && (
            <AnalysisCard
              analysis={proposal.analysis}
              onBack={() => setStep("goal")}
              onContinue={() => setStep("strategy")}
            />
          )}

          {step === "strategy" && proposal && (
            <StrategyCard
              strategy={proposal.strategy}
              onBack={() => setStep("feasibility")}
              onContinue={() => setStep("approval")}
            />
          )}

          {step === "approval" &&
            proposal &&
            (wallet ? (
              <ApprovalCard
                strategy={proposal.strategy}
                positionAddress={wallet.positionAddress}
                onExecuted={afterExecution}
                onBack={() => setStep("strategy")}
                onCancel={() => setStep("goal")}
              />
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/40">
                Connect the wallet to approve and execute this strategy.
              </p>
            ))}
        </div>
      )}
    </>
  );
}

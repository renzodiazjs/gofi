"use client";

import { useCallback, useEffect, useState } from "react";

import type { GoalAnalysis } from "@/lib/ai/goal-analyzer";
import type { GoalHistoryEntry } from "@/lib/supabase/goals";
import type { GoalRow, StrategyRow } from "@/lib/supabase/types";
import type { WalletSnapshot } from "@/lib/wdk/account";
import { AccountMenu } from "./account-menu";
import { ApprovalCard } from "./approval-card";
import { GoalForm, type GoalDraft } from "./goal-form";
import { GoalRecap } from "./goal-recap";
import { GoalsView } from "./goals-view";
import { Hero } from "./hero";
import { Protocols } from "./protocols";
import { Stepper, type FlowStep } from "./stepper";
import { AnalysisCard, StrategyCard } from "./strategy-view";


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
  const [submitted, setSubmitted] = useState<GoalDraft | null>(null);
  const [settledHash, setSettledHash] = useState<string | null>(null);
  const [view, setView] = useState<"flow" | "goals">("flow");

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
      setSubmitted(draft);
      setStep("feasibility");
      void loadHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  const afterExecution = useCallback(
    (hash: string) => {
      setSettledHash(hash);
      void refreshWallet();
      void loadHistory();
    },
    [refreshWallet, loadHistory]
  );

  return (
    <>
      {/* A bar, not a masthead: on the landing the hero already introduces the
          product, so repeating the pitch up here would say it twice. */}
      <header className="mb-16 flex items-center justify-between gap-6">
        <div className="flex items-baseline gap-3">
          <span className="gradient-text text-xl font-semibold tracking-tight">
            GoFI
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
            Goal Finance
          </span>
        </div>

        {/*
          The address is the account, so the track record hangs off it: it is
          that wallet's history, not a step in the flow.
        */}
        {wallet && (
          <AccountMenu
            snapshot={wallet}
            goalCount={(history ?? []).length}
            onOpenGoals={() => setView("goals")}
            onDisconnect={() => {
              setWallet(null);
              setView("flow");
              setStep("wallet");
            }}
          />
        )}
      </header>

      {view === "goals" ? (
        <GoalsView
          entries={history}
          loading={historyLoading}
          error={historyError}
          onReload={loadHistory}
          onNewGoal={() => {
            // A new goal starts clean, otherwise the recap would carry the
            // previous run's verdict into an unrelated one.
            setProposal(null);
            setSubmitted(null);
            setSettledHash(null);
            setView("flow");
            setStep("goal");
          }}
        />
      ) : step === "wallet" ? (
        <>
          <Hero
            onConnect={connect}
            connecting={walletLoading}
            error={walletError}
          />

          <div id="rails" className="mt-28 scroll-mt-12">
            <Protocols />
          </div>
        </>
      ) : (
        <div className="space-y-5">
          <Stepper
            current={step as FlowStep}
            executed={settledHash !== null}
            onJump={(target) => setStep(target)}
          />

          {/* Only once there is a goal to recap — on step 01 the form itself is
              still asking the question. */}
          {submitted && step !== "goal" && (
            <GoalRecap
              goal={submitted}
              analysis={proposal?.analysis}
              hash={settledHash ?? undefined}
            />
          )}

          {step === "goal" && (
            <div id="goal" className="scroll-mt-8">
              <GoalForm
                onSubmit={analyze}
                onBack={() => setStep("wallet")}
                busy={busy}
                error={error}
                initial={submitted}
                analysed={proposal !== null}
                onResume={() => setStep("feasibility")}
              />
            </div>
          )}

          {step === "feasibility" && proposal && (
            <AnalysisCard
              analysis={proposal.analysis}
              horizonMonths={submitted?.timeHorizonMonths ?? proposal.goal.time_horizon_months}
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

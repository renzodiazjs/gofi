"use client";

import { useState } from "react";

import type { RiskProfile } from "@/types";
import { Button, Card, ErrorNote } from "./ui";

const RISK_PROFILES: RiskProfile[] = [
  "conservative",
  "moderate",
  "aggressive",
];

export type GoalDraft = {
  initialCapital: number;
  targetAmount: number;
  timeHorizonMonths: number;
  riskProfile: RiskProfile;
};

function NumberInput({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-white/35">
        {label}
      </span>
      <div className="mt-1.5 flex items-center rounded-lg border border-white/10 bg-black/40 focus-within:border-white/30">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          // A focused number input treats the scroll wheel as increment/
          // decrement, so scrolling the page over it silently rewrites the
          // amount. Blurring on wheel is the only reliable way to stop it.
          onWheel={(event) => event.currentTarget.blur()}
          className="w-full bg-transparent px-3 py-2.5 font-mono text-sm text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="px-3 text-xs text-white/30">{suffix}</span>
      </div>
    </label>
  );
}

export function GoalForm({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (goal: GoalDraft) => void;
  busy: boolean;
  error: string | null;
}) {
  const [draft, setDraft] = useState<GoalDraft>({
    initialCapital: 100,
    targetAmount: 110,
    timeHorizonMonths: 12,
    riskProfile: "moderate",
  });

  const set = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Card title="Financial goal" step="01">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(draft);
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="I have"
            suffix="USDT"
            value={draft.initialCapital}
            onChange={(value) => set("initialCapital", value)}
          />
          <NumberInput
            label="I want"
            suffix="USDT"
            value={draft.targetAmount}
            onChange={(value) => set("targetAmount", value)}
          />
        </div>

        <NumberInput
          label="Within"
          suffix="months"
          value={draft.timeHorizonMonths}
          onChange={(value) => set("timeHorizonMonths", value)}
        />

        <div>
          <span className="text-[11px] uppercase tracking-widest text-white/35">
            Risk profile
          </span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {RISK_PROFILES.map((profile) => (
              <button
                key={profile}
                type="button"
                onClick={() => set("riskProfile", profile)}
                className={`rounded-lg border px-3 py-2.5 text-xs capitalize transition ${
                  draft.riskProfile === profile
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-white/10 text-white/45 hover:border-white/20"
                }`}
              >
                {profile}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <Button type="submit" disabled={busy}>
          {busy ? "Analyzing…" : "Analyze goal"}
        </Button>
      </form>
    </Card>
  );
}

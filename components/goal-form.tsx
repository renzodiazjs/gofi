"use client";

import { useEffect, useRef, useState } from "react";

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
  integer = true,
  hint,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
  integer?: boolean;
  hint?: string;
}) {
  // The input is kept as a raw string while the user edits, so the field can
  // legitimately be empty (no auto-collapsed "0") and so we control exactly
  // which characters survive the keystroke filter.
  const [draft, setDraft] = useState<string>(String(value));
  const focused = useRef(false);

  // Sync the draft from the canonical parent value when the user is not
  // actively editing (e.g. after navigating back to this step).
  useEffect(() => {
    if (!focused.current) {
      setDraft(String(value));
    }
  }, [value]);

  const pattern = integer ? /^\d*$/ : /^\d*\.?\d*$/;

  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-white/35">
        {label}
      </span>
      <div className="mt-1.5 flex items-center rounded-lg border border-white/10 bg-black/40 focus-within:border-white/30">
        <input
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          min={0}
          value={draft}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(event) => {
            const next = event.target.value;
            if (!pattern.test(next)) return;
            setDraft(next);
            if (next === "") return;
            const parsed = Number(next);
            if (Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          onBlur={() => {
            focused.current = false;
            if (draft === "") {
              setDraft("0");
              onChange(0);
            } else {
              setDraft(String(value));
            }
          }}
          // A focused number input treats the scroll wheel as increment/
          // decrement, so scrolling the page over it silently rewrites the
          // amount. Blurring on wheel is the only reliable way to stop it.
          onWheel={(event) => event.currentTarget.blur()}
          className="w-full bg-transparent px-3 py-2.5 font-mono text-sm text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="px-3 text-xs text-white/30">{suffix}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-rose-300/60">{hint}</p>}
    </label>
  );
}

const EMPTY_DRAFT: GoalDraft = {
  initialCapital: 100,
  targetAmount: 110,
  timeHorizonMonths: 12,
  riskProfile: "moderate",
};

export function GoalForm({
  onSubmit,
  onBack,
  busy,
  error,
  initial,
  analysed = false,
  onResume,
  backLabel = "Back",
}: {
  onSubmit: (goal: GoalDraft) => void;
  onBack: () => void;
  busy: boolean;
  error: string | null;
  /**
   * What the user last submitted. This step unmounts when the flow moves on,
   * so without it "edit the goal" would hand back the defaults instead of the
   * numbers they actually typed.
   */
  initial?: GoalDraft | null;
  /** True once a verdict exists, which turns this step into an edit. */
  analysed?: boolean;
  /** Return to the existing verdict without recomputing it. */
  onResume?: () => void;
  /**
   * Names where onBack actually goes. A returning user leaves this step for
   * their dashboard, not for a connect screen they are already past.
   */
  backLabel?: string;
}) {
  const [draft, setDraft] = useState<GoalDraft>(initial ?? EMPTY_DRAFT);

  const dirty =
    !initial ||
    draft.initialCapital !== initial.initialCapital ||
    draft.targetAmount !== initial.targetAmount ||
    draft.timeHorizonMonths !== initial.timeHorizonMonths ||
    draft.riskProfile !== initial.riskProfile;

  const set = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const initialInvalid = draft.initialCapital <= 0;
  const targetInvalid = draft.targetAmount <= draft.initialCapital;
  const formInvalid = initialInvalid || targetInvalid;

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
            integer={false}
            hint={
              initialInvalid
                ? "Initial capital must be greater than 0."
                : undefined
            }
          />
          <NumberInput
            label="I want"
            suffix="USDT"
            value={draft.targetAmount}
            onChange={(value) => set("targetAmount", value)}
            integer={false}
            hint={
              targetInvalid
                ? "Target must be greater than the initial capital."
                : undefined
            }
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

        <div className="flex flex-wrap items-center gap-3">
          {/*
            Editing is not the same as starting over. If the numbers changed the
            verdict has to be recomputed — showing the old one against new
            figures would be a lie. If they did not, re-running costs forty
            seconds and a duplicate record to arrive at the answer already on
            screen, so the button simply takes you back to it.
          */}
          {analysed && !dirty ? (
            <Button type="button" variant="shimmer" onClick={onResume}>
              Back to feasibility
            </Button>
          ) : (
            <Button
              type="submit"
              variant="shimmer"
              disabled={busy || formInvalid}
            >
              {busy
                ? "Analyzing…"
                : analysed
                  ? "Update analysis"
                  : "Analyze goal"}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={analysed && onResume ? onResume : onBack}
          >
            {analysed ? "Discard changes" : backLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

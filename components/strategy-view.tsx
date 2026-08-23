"use client";

import type { GoalAnalysis } from "@/lib/ai/goal-analyzer";
import type { Feasibility, StrategyRow } from "@/lib/supabase/types";
import { Badge, Button, Card, Field, type BadgeTone } from "./ui";

const FEASIBILITY_TONE: Record<Feasibility, BadgeTone> = {
  feasible: "emerald",
  ambitious: "amber",
  unrealistic: "rose",
};

const CONFIDENCE_TONE: Record<StrategyRow["confidence"], BadgeTone> = {
  high: "emerald",
  medium: "amber",
  low: "rose",
};

export function AnalysisCard({
  analysis,
  horizonMonths,
  onBack,
  onContinue,
}: {
  analysis: GoalAnalysis;
  /** Named in the label so the reader can see why two figures can coincide. */
  horizonMonths: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <Card title="Feasibility" step="02">
      <div className="mb-5">
        <Badge tone={FEASIBILITY_TONE[analysis.feasibility]}>
          {analysis.feasibility}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-8">
        {/*
          At a twelve-month horizon the total return and the APY are the same
          number by definition. Without the horizon on the label that reads as a
          duplicate rather than an identity, and the first question becomes
          whether the screen is broken.
        */}
        <Field
          label={`Required return over ${horizonMonths} months`}
          value={`${analysis.requiredReturnPct}%`}
        />
        <Field label="Per month" value={`${analysis.monthlyReturnPct}%`} />
        <Field
          label="Equivalent APY"
          value={`${analysis.annualizedReturnPct}%`}
        />
        <Field
          label="Realistic ceiling"
          value={`${analysis.ceilingApyPct}% APY`}
        />
      </dl>

      {analysis.suggestions.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-4">
          <p className="text-[11px] uppercase tracking-widest text-amber-300/70">
            This target does not fit. What would:
          </p>
          <ul className="mt-2 space-y-1.5">
            {analysis.suggestions.map((suggestion) => (
              <li key={suggestion} className="text-sm text-amber-100/80">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        Two identical buttons make the reader work out which one is the way
        forward. The step that advances carries the weight and sits first, the
        way it does on every other screen in the flow.
      */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" variant="shimmer" onClick={onContinue}>
          See the strategy
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Edit financial goal
        </Button>
      </div>
    </Card>
  );
}

export function StrategyCard({
  strategy,
  onBack,
  onContinue,
  keeping = false,
}: {
  strategy: StrategyRow;
  onBack: () => void;
  onContinue: () => void;
  /** True while the goal is being promoted out of draft. */
  keeping?: boolean;
}) {
  return (
    <Card title="Proposed strategy" step="03">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={CONFIDENCE_TONE[strategy.confidence]}>
          {strategy.confidence} confidence
        </Badge>
        <Badge>{strategy.model}</Badge>
      </div>

      <div className="space-y-3">
        {strategy.allocations.map((allocation, index) => (
          <div
            key={`${allocation.asset}-${index}`}
            className="rounded-lg border border-white/[0.07] bg-black/30 p-4"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-sm text-white">
                {allocation.percentage}% {allocation.asset}
              </span>
              {allocation.expectedApyPct !== null && (
                <span className="font-mono text-xs text-white/40">
                  ~{allocation.expectedApyPct}% APY est.
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-white/60">{allocation.action}</p>

            {allocation.protocol && (
              <p className="mt-2 text-xs text-white/35">
                via {allocation.protocol}
              </p>
            )}

            <p className="mt-2 text-xs leading-relaxed text-white/40">
              {allocation.rationale}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-white/[0.07] pt-4">
        <p className="text-[11px] uppercase tracking-widest text-white/35">
          Reasoning
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {strategy.reasoning}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {/*
          Keeping happens here, not at analysis. Trying a goal on should not
          fill somebody's list with things they were only curious about.
        */}
        <Button
          type="button"
          variant="shimmer"
          onClick={onContinue}
          disabled={keeping}
        >
          {keeping ? "Keeping…" : "Keep this strategy"}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Back to feasibility
        </Button>
      </div>
    </Card>
  );
}

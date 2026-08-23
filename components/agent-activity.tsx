"use client";

import { useEffect, useState } from "react";

/**
 * What the model is actually doing, in the order it does it.
 *
 * These are the real phases of one request, not invented reassurance. The
 * arithmetic is already finished and on screen by the time any of this shows.
 */
export const AGENT_STAGES = [
  "Reading the verdict and the caps",
  "Choosing what can actually execute today",
  "Sizing the allocation",
  "Writing the reasoning",
] as const;

const STAGE_MS = 4_200;

/**
 * Advances through the stages while work is in flight and holds on the last
 * one rather than looping. A stage list that restarts reads as a progress bar
 * that lost its place.
 */
export function useAgentStage(active: boolean) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) return;

    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, AGENT_STAGES.length - 1));
    }, STAGE_MS);

    return () => clearInterval(timer);
  }, [active]);

  return stage;
}

export type AgentState = "working" | "ready" | "failed";

/**
 * The agent working, shown next to the verdict it is working from.
 *
 * The strategy call starts the moment the goal is submitted and runs while the
 * reader is on the feasibility step, so by the time they reach step 03 it has
 * usually finished and the full thinking card never appears. Rather than stall
 * the flow so an animation can play, this says what is happening at the moment
 * it is happening.
 */
export function AgentStrip({ state }: { state: AgentState }) {
  const stage = useAgentStage(state === "working");

  if (state === "failed") {
    return (
      <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        <p className="text-xs text-rose-200/70">
          The allocation step failed. The verdict above still stands — it needed
          no model.
        </p>
      </div>
    );
  }

  if (state === "ready") {
    return (
      <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5">
            <path
              d="m5 13 4 4 10-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="font-mono text-[11px] tracking-wide text-white/40">
          GoFI finished the allocation — it is waiting on step 03.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-white/[0.07] pt-4">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-spark opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-spark" />
        </span>
        <p className="font-mono text-[11px] tracking-wide text-spark/80">
          GoFI is building the allocation
        </p>
      </div>

      <p
        key={stage}
        className="stage-in mt-2 pl-5 text-xs text-white/35"
        aria-live="polite"
      >
        {AGENT_STAGES[stage]}…
      </p>
    </div>
  );
}

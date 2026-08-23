"use client";

import { Card } from "./ui";

const STAGES = [
  "Reading the verdict and the caps",
  "Choosing what can actually execute today",
  "Sizing the allocation",
  "Writing the reasoning",
];

/**
 * Shown only while the model is genuinely still working.
 *
 * The stages are the real shape of the request, not invented reassurance: the
 * arithmetic is already done and on screen by this point, and what remains is
 * one call that takes about half a minute. Saying what it is doing beats a
 * spinner that could mean anything.
 */
export function ThinkingCard() {
  return (
    <Card title="Proposed strategy" step="03">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-spark opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-spark" />
        </span>
        <p className="text-sm text-white/70">
          GoFI is building the allocation…
        </p>
      </div>

      <ol className="mt-5 space-y-2">
        {STAGES.map((stage, index) => (
          <li
            key={stage}
            className="stage-in flex items-center gap-3 text-xs text-white/35"
            style={{ animationDelay: `${index * 2200}ms` }}
          >
            <span className="h-1 w-1 rounded-full bg-white/25" />
            {stage}
          </li>
        ))}
      </ol>

      <p className="mt-6 max-w-prose text-xs leading-relaxed text-white/25">
        The feasibility verdict above needed no model — it is compound interest,
        computed in code. This step is the only one that waits on one.
      </p>
    </Card>
  );
}

"use client";

import { AGENT_STAGES, useAgentStage } from "./agent-activity";
import { Card } from "./ui";

/**
 * Shown only while the model is genuinely still working.
 *
 * The stages are the real shape of the request, not invented reassurance: the
 * arithmetic is already done and on screen by this point, and what remains is
 * one call that takes about half a minute. Saying what it is doing beats a
 * spinner that could mean anything.
 *
 * The stages advance on a timer rather than on fixed CSS delays, so the list
 * holds on the last one until the answer lands instead of finishing its
 * animation and leaving a card that looks done while the request is still open.
 */
export function ThinkingCard() {
  const stage = useAgentStage(true);

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

      <ol className="mt-5 space-y-2.5">
        {AGENT_STAGES.map((label, index) => {
          const done = index < stage;
          const current = index === stage;

          return (
            <li
              key={label}
              className={`flex items-center gap-3 text-xs transition-colors duration-500 ${
                current
                  ? "text-white/70"
                  : done
                    ? "text-white/30"
                    : "text-white/15"
              }`}
            >
              <span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
                {done ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-300/70">
                    <path
                      d="m5 13 4 4 10-10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : current ? (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-spark opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-spark" />
                  </span>
                ) : (
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                )}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      <p className="mt-6 max-w-prose text-xs leading-relaxed text-white/25">
        The feasibility verdict above needed no model — it is compound interest,
        computed in code. This step is the only one that waits on one.
      </p>
    </Card>
  );
}

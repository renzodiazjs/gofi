"use client";

export type FlowStep = "goal" | "feasibility" | "strategy" | "approval";

const STEPS: { id: FlowStep; index: string; label: string }[] = [
  { id: "goal", index: "01", label: "Goal" },
  { id: "feasibility", index: "02", label: "Feasibility" },
  { id: "strategy", index: "03", label: "Strategy" },
  { id: "approval", index: "04", label: "Approve" },
];

/**
 * Progress through the flow.
 *
 * The numbering is not decoration here: you cannot judge a goal before stating
 * it, or approve a strategy before it exists. The order is a real dependency
 * chain, which is exactly when a stepper earns its place.
 */
export function Stepper({
  current,
  executed,
  onJump,
}: {
  current: FlowStep;
  /** Once the transaction lands, the last step is done rather than in progress. */
  executed: boolean;
  onJump: (step: FlowStep) => void;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  const reached = executed ? STEPS.length : currentIndex;

  // The bar spans the centres of the first and last markers, so it fills to
  // exactly where a marker sits rather than to the edge of the row.
  const span = 100 / (STEPS.length - 1);
  const progress = Math.min(reached, STEPS.length - 1) * span;

  return (
    <nav aria-label="Progress" className="mb-8">
      <div className="relative">
        <div className="absolute inset-x-0 top-[11px] mx-[12.5%] h-px bg-white/10" />
        <div
          className="absolute top-[11px] left-[12.5%] h-px bg-spark transition-[width] duration-700 ease-out"
          style={{ width: `${progress * 0.75}%` }}
        />

        <ol className="relative grid grid-cols-4">
          {STEPS.map((step, index) => {
            const done = index < currentIndex || (executed && index <= currentIndex);
            const active = index === currentIndex && !executed;
            const reachable = index < currentIndex;

            return (
              <li key={step.id} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => reachable && onJump(step.id)}
                  disabled={!reachable}
                  aria-current={active ? "step" : undefined}
                  className={`grid h-[23px] w-[23px] place-items-center rounded-full border transition ${
                    done
                      ? "border-spark bg-spark text-ink-950"
                      : active
                        ? "border-spark bg-[#08080a] text-spark shadow-[0_0_14px_-2px_var(--spark)]"
                        : "border-white/15 bg-[#08080a] text-white/25"
                  } ${reachable ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
                >
                  {done ? (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                      <path
                        d="M2.5 6.2 4.8 8.5 9.5 3.8"
                        fill="none"
                        stroke="#08080a"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? "bg-spark" : "bg-white/25"
                      }`}
                    />
                  )}
                </button>

                <span className="text-center leading-tight">
                  <span
                    className={`block font-mono text-[10px] ${
                      active ? "text-spark" : "text-white/25"
                    }`}
                  >
                    {step.index}
                  </span>
                  <span
                    className={`block text-[11px] ${
                      active
                        ? "text-white"
                        : done
                          ? "text-white/50"
                          : "text-white/25"
                    }`}
                  >
                    {step.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

import type { ReactNode } from "react";

export function Card({
  title,
  step,
  children,
  muted = false,
}: {
  title: string;
  step?: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/[0.02] p-6 transition ${
        muted ? "opacity-40" : ""
      }`}
    >
      <header className="mb-5 flex items-baseline gap-3">
        {step && (
          <span className="font-mono text-xs text-white/30">{step}</span>
        )}
        <h2 className="text-sm font-medium tracking-wide text-white/70 uppercase">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-t border-white/[0.07] py-2.5 first:border-t-0 first:pt-0">
      <dt className="text-[11px] uppercase tracking-widest text-white/35">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm break-all text-white/90">{value}</dd>
    </div>
  );
}

const BADGE_TONES = {
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  slate: "border-white/15 bg-white/5 text-white/60",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  tone = "slate",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-white text-black hover:bg-white/85"
      : "border border-white/15 text-white/70 hover:bg-white/5";

  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${styles}`}
    >
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {children}
    </p>
  );
}

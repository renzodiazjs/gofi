"use client";

import { ChainStack } from "./chain-stack";

/**
 * The first screen has three jobs and no others: say what GoFI does, say what
 * it is built on, and let you in. Everything else waits until after sign-in.
 */
export function Hero({
  onConnect,
  connecting,
  error,
}: {
  onConnect: () => void;
  connecting: boolean;
  error: string | null;
}) {
  return (
    <section className="flex flex-col items-center text-center">
      {/*
        The WDK credit sits above the headline rather than in the footer. It is
        the answer to "what is this built on", which is the second thing anyone
        judging this project wants to know.
      */}
      <a
        href="https://docs.wdk.tether.io/"
        target="_blank"
        rel="noreferrer"
        className="animate-rise group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-2 pr-4 transition hover:border-spark/40"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-spark/15 text-spark">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
            <path
              d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-sm text-white/70 transition group-hover:text-white">
          Built with Tether&rsquo;s <span className="text-spark">WDK</span>
        </span>
      </a>

      <h1
        className="animate-rise mt-8 max-w-3xl text-5xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl"
        style={{ animationDelay: "80ms" }}
      >
        Turn goals into{" "}
        <span className="font-accent font-normal italic text-spark">
          on-chain strategies
        </span>
      </h1>

      <p
        className="animate-rise mt-6 max-w-lg text-base leading-relaxed text-white/55"
        style={{ animationDelay: "160ms" }}
      >
        Tell GoFI what you want your money to do. It runs the arithmetic first,
        tells you if the goal is reachable, and executes the plan from a
        self-custodial wallet.
      </p>

      <div
        className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3"
        style={{ animationDelay: "240ms" }}
      >
        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
          className="shimmer rounded-full px-6 py-3 text-sm font-medium tracking-wide text-spark transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {connecting ? "Reading chain…" : "Connect wallet"}
        </button>

        <a
          href="#rails"
          className="rounded-full border border-white/12 px-6 py-3 text-sm font-medium text-white/60 transition hover:border-white/30 hover:text-white"
        >
          How it works
        </a>
      </div>

      <p
        className="animate-rise mt-5 font-mono text-[11px] tracking-wide text-white/25"
        style={{ animationDelay: "300ms" }}
      >
        Ethereum Sepolia testnet · no real funds
      </p>

      {error && (
        <p className="mt-5 max-w-md rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div
        className="animate-rise mt-8 w-full"
        style={{ animationDelay: "380ms" }}
      >
        <div className="flex justify-center">
          <ChainStack />
        </div>
      </div>
    </section>
  );
}

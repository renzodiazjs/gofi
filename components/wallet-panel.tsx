"use client";

import { useState } from "react";

import type { WalletSnapshot } from "@/lib/wdk/account";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; snapshot: WalletSnapshot }
  | { status: "error"; message: string };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/10 py-3">
      <dt className="text-xs uppercase tracking-widest text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm break-all text-white">{value}</dd>
    </div>
  );
}

export function WalletPanel() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function initialize() {
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/wallet");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed");
      }

      setState({ status: "ready", snapshot: payload as WalletSnapshot });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <section className="w-full max-w-lg">
      <button
        type="button"
        onClick={initialize}
        disabled={state.status === "loading"}
        className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/85 disabled:opacity-40"
      >
        {state.status === "loading" ? "Reading chain…" : "Initialize Wallet"}
      </button>

      {state.status === "error" && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <dl className="mt-8">
          <Row label="Wallet" value={state.snapshot.address} />
          <Row
            label="Network"
            value={`${state.snapshot.network.displayName} · chain ${state.snapshot.network.chainId}`}
          />
          <Row
            label="Balance"
            value={`${state.snapshot.native.formatted} ${state.snapshot.native.symbol}`}
          />
          {state.snapshot.tokens.map((token) => (
            <Row
              key={token.symbol}
              label={token.symbol}
              value={`${token.formatted} ${token.symbol}`}
            />
          ))}
        </dl>
      )}
    </section>
  );
}

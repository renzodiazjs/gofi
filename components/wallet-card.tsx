"use client";

import type { WalletSnapshot } from "@/lib/wdk/account";
import { Badge, Button, Card, ErrorNote, Field } from "./ui";

/**
 * Presentational. The parent owns the snapshot so that executing a strategy can
 * refresh balances without this component reaching into an effect to do it.
 */
export function WalletCard({
  snapshot,
  loading,
  error,
  onLoad,
  canContinue,
  onContinue,
}: {
  snapshot: WalletSnapshot | null;
  loading: boolean;
  error: string | null;
  onLoad: () => void;
  canContinue: boolean;
  onContinue: () => void;
}) {
  // No step number: the wallet is a prerequisite, not step zero of 01–04.
  return (
    <Card title="Wallet">
      {!snapshot && (
        <div className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={onLoad} disabled={loading}>
            {loading ? "Reading chain…" : error ? "Retry" : "Initialize Wallet"}
          </Button>
        </div>
      )}

      {snapshot && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="emerald">{snapshot.network.displayName}</Badge>
            <Badge>chain {snapshot.network.chainId}</Badge>
            {snapshot.network.testnet && <Badge tone="amber">testnet</Badge>}
          </div>

          <dl>
            <Field
              label="Address"
              value={
                <a
                  href={snapshot.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-white/20 underline-offset-4 hover:decoration-white/60"
                >
                  {snapshot.address}
                </a>
              }
            />
            <Field
              label={snapshot.native.symbol}
              value={`${snapshot.native.formatted} ${snapshot.native.symbol}`}
            />
            {snapshot.tokens.map((token) => (
              <Field
                key={token.symbol}
                label={token.symbol}
                value={`${token.formatted} ${token.symbol}`}
              />
            ))}
          </dl>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={onLoad} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button variant="ghost" onClick={onContinue} disabled={!canContinue}>
              Set a goal
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

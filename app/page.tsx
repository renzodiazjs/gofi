import { GofiApp } from "@/components/gofi-app";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <header className="mb-12">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">GoFI</h1>
          <span className="text-xs uppercase tracking-[0.2em] text-white/30">
            Goal Finance
          </span>
        </div>
        <p className="mt-4 text-lg text-white/60">
          Turn financial goals into on-chain strategies.
        </p>
      </header>

      <GofiApp />

      <footer className="mt-16 border-t border-white/[0.07] pt-6 text-xs text-white/25">
        Ethereum Sepolia testnet · self-custodial wallet via WDK · spending caps
        and allowlists enforced in the wallet layer
      </footer>
    </main>
  );
}

import { WalletPanel } from "@/components/wallet-panel";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-20">
      <header className="mb-12">
        <h1 className="text-4xl font-semibold tracking-tight">GoFI</h1>
        <p className="mt-1 text-sm uppercase tracking-widest text-white/40">
          Goal Finance
        </p>
        <p className="mt-6 text-lg text-white/70">
          Turn financial goals into on-chain strategies.
        </p>
      </header>

      <WalletPanel />

      <footer className="mt-16 text-xs text-white/30">
        Testnet only · powered by WDK
      </footer>
    </main>
  );
}

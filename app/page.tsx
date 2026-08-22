import { GofiApp } from "@/components/gofi-app";
import { Particles } from "@/components/particles";

export default function Home() {
  return (
    <>
      <Particles />

      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <GofiApp />

        <footer className="mt-20 border-t border-white/[0.07] pt-6 text-xs text-white/25">
          Ethereum Sepolia testnet · self-custodial wallet via WDK · spending
          caps and allowlists enforced in the wallet layer
        </footer>
      </main>
    </>
  );
}

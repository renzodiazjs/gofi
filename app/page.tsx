import { GofiApp } from "@/components/gofi-app";
import { Particles } from "@/components/particles";

export default function Home() {
  return (
    <>
      <Particles />

      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <GofiApp />

        <footer className="mt-20 space-y-2 border-t border-white/[0.07] pt-6 text-xs text-white/25">
          <p>
            Ethereum Sepolia testnet · self-custodial wallet · spending caps and
            allowlists enforced in the wallet layer
          </p>
          <p>Built with Tether&rsquo;s Wallet Development Kit</p>
        </footer>
      </main>
    </>
  );
}

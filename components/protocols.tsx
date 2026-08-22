/**
 * The claim the landing rests on: GoFI is a layer over infrastructure that
 * already exists, not a venue of its own.
 */
export function Protocols() {
  return (
    <section>
      <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
        Built on rails
        <br />
        you already trust
      </h2>

      <p className="mt-5 max-w-md text-sm leading-relaxed text-white/50">
        GoFI does not run its own exchange or invent a protocol. It reads your
        goal, checks the arithmetic, and routes the result through
        infrastructure that already holds real money.
      </p>

      <p className="mt-5 max-w-md text-xs leading-relaxed text-white/30">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-px rounded-full bg-emerald-400" />
        Live on Sepolia today. The rest are the protocols strategies are written
        against, and are not wired up yet.
      </p>
    </section>
  );
}

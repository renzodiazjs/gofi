/** Formats a base-unit bigint into a human-readable decimal string. */
export function formatUnits(
  value: bigint,
  decimals: number,
  maxFractionDigits = 6
): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);

  const whole = abs / base;
  const fraction = (abs % base).toString().padStart(decimals, "0");

  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  const sign = negative ? "-" : "";

  return trimmed ? `${sign}${whole}.${trimmed}` : `${sign}${whole}`;
}

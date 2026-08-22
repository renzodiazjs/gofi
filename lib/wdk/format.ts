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

/** Parses a decimal string into base units. Throws on excess precision. */
export function parseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`"${value}" is not a valid positive decimal amount.`);
  }

  const [whole, fraction = ""] = trimmed.split(".");

  if (fraction.length > decimals) {
    throw new Error(
      `Amount has ${fraction.length} decimals but the token allows ${decimals}.`
    );
  }

  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

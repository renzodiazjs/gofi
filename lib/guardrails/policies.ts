import type { Policy, PolicyContext } from "@tetherto/wdk";

import { SEPOLIA, SEPOLIA_USDT } from "@/lib/wdk/networks";
import {
  ALLOWED_TOKENS,
  DEFAULT_GUARDRAILS,
  MAX_NATIVE_WEI,
  MAX_USDT_BASE_UNITS,
} from "./config";
import { usdtVolumeToday } from "./daily-volume";

type TransferArgs = { token?: unknown; amount?: unknown };
type TransactionArgs = { value?: unknown };

function firstArg<T>(context: PolicyContext): T | null {
  const arg = context.args[0];
  return arg && typeof arg === "object" ? (arg as T) : null;
}

function toBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return null;
}

function isAllowedToken(context: PolicyContext): boolean {
  const args = firstArg<TransferArgs>(context);
  if (!args || typeof args.token !== "string") return false;
  return ALLOWED_TOKENS.has(args.token.toLowerCase());
}

function isWithinTokenCap(context: PolicyContext): boolean {
  const amount = toBigInt(firstArg<TransferArgs>(context)?.amount);
  return amount !== null && amount <= MAX_USDT_BASE_UNITS;
}

function isWithinNativeCap(context: PolicyContext): boolean {
  const value = toBigInt(firstArg<TransactionArgs>(context)?.value);
  return value !== null && value <= MAX_NATIVE_WEI;
}

/**
 * Would this transfer push today's USD₮ total past the daily cap?
 *
 * The per-transaction cap alone never stopped anyone from sending it ten times
 * in a row, so the daily limit the interface promises has to be evaluated here,
 * against the ledger, at the moment of signing.
 */
async function exceedsDailyVolume(context: PolicyContext): Promise<boolean> {
  const amount = toBigInt(firstArg<TransferArgs>(context)?.amount);
  if (amount === null) return true;

  const requested = Number(amount) / 10 ** SEPOLIA_USDT.decimals;
  const spent = await usdtVolumeToday();

  return spent + requested > DEFAULT_GUARDRAILS.maxDailyVolumeUsd;
}

/**
 * Compiles the GoFI guardrails into WDK policies.
 *
 * WDK's policy engine is DEFAULT-DENY: once any policy governs an account,
 * an operation is blocked unless an ALLOW rule explicitly matches it. That is
 * why this list ends with `gofi-permitted-operations` — without it nothing
 * could move at all, including legitimate transfers.
 *
 * The DENY rules are still worth keeping: DENY always beats ALLOW, they carry
 * far better error messages than the engine's generic `governed-but-unmatched`,
 * and they document intent explicitly rather than relying on an absence.
 *
 * DENY conditions are fail-closed (a throw counts as a match), ALLOW conditions
 * are fail-open-as-no-match. Both directions therefore err towards blocking.
 */
export function buildGuardrailPolicies(): Policy[] {
  return [
    {
      id: "gofi-asset-allowlist",
      name: "GoFI asset allowlist",
      scope: "project",
      wallet: SEPOLIA,
      rules: [
        {
          name: "deny-unlisted-token",
          reason: "Token is not on the GoFI allowlist.",
          operation: "transfer",
          action: "DENY",
          conditions: [(context) => !isAllowedToken(context)],
        },
      ],
    },
    {
      id: "gofi-spending-cap",
      name: "GoFI per-transaction spending cap",
      scope: "project",
      wallet: SEPOLIA,
      rules: [
        {
          name: "deny-token-transfer-over-cap",
          reason: `Transfer exceeds the per-transaction cap of ${
            MAX_USDT_BASE_UNITS / 1_000_000n
          } USDT.`,
          operation: "transfer",
          action: "DENY",
          conditions: [(context) => !isWithinTokenCap(context)],
        },
        {
          name: "deny-native-transfer-over-cap",
          reason: "Native transfer exceeds the per-transaction cap of 0.05 ETH.",
          operation: "sendTransaction",
          action: "DENY",
          conditions: [(context) => !isWithinNativeCap(context)],
        },
        {
          name: "deny-over-daily-volume",
          reason: `Transfer would exceed the daily cap of ${DEFAULT_GUARDRAILS.maxDailyVolumeUsd} USDT.`,
          operation: "transfer",
          action: "DENY",
          conditions: [exceedsDailyVolume],
        },
      ],
    },
    {
      id: "gofi-no-approvals",
      name: "GoFI approval lockdown",
      scope: "project",
      wallet: SEPOLIA,
      rules: [
        {
          name: "deny-all-approvals",
          reason:
            "ERC-20 approvals are disabled until protocol allowlists are configured.",
          operation: ["approve", "signAuthorization"],
          action: "DENY",
          conditions: [() => true],
        },
      ],
    },
    {
      id: "gofi-permitted-operations",
      name: "GoFI permitted operations",
      scope: "project",
      wallet: SEPOLIA,
      rules: [
        {
          name: "allow-allowlisted-token-transfer-within-cap",
          operation: "transfer",
          action: "ALLOW",
          conditions: [isAllowedToken, isWithinTokenCap],
        },
        {
          name: "allow-native-transfer-within-cap",
          operation: "sendTransaction",
          action: "ALLOW",
          conditions: [isWithinNativeCap],
        },
      ],
    },
  ];
}

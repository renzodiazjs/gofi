import type { Policy, PolicyContext } from "@tetherto/wdk";

import { SEPOLIA } from "@/lib/wdk/networks";
import {
  ALLOWED_TOKENS,
  MAX_NATIVE_WEI,
  MAX_USDT_BASE_UNITS,
} from "./config";

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

/**
 * Compiles the GoFI guardrails into WDK policies.
 *
 * Every rule is fail-closed: a condition that throws or times out on a DENY
 * rule counts as a match, so an unreadable argument blocks the operation
 * instead of slipping through.
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
          conditions: [
            (context) => {
              const args = firstArg<TransferArgs>(context);
              if (!args || typeof args.token !== "string") return true;
              return !ALLOWED_TOKENS.has(args.token.toLowerCase());
            },
          ],
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
          conditions: [
            (context) => {
              const args = firstArg<TransferArgs>(context);
              const amount = toBigInt(args?.amount);
              if (amount === null) return true;
              return amount > MAX_USDT_BASE_UNITS;
            },
          ],
        },
        {
          name: "deny-native-transfer-over-cap",
          reason: "Native transfer exceeds the per-transaction cap of 0.05 ETH.",
          operation: "sendTransaction",
          action: "DENY",
          conditions: [
            (context) => {
              const args = firstArg<TransactionArgs>(context);
              if (!args) return true;
              const value = toBigInt(args.value);
              if (value === null) return true;
              return value > MAX_NATIVE_WEI;
            },
          ],
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
  ];
}

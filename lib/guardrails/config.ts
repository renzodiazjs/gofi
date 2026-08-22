import type { Guardrails } from "@/types";

import { SEPOLIA_USDT } from "@/lib/wdk/networks";

/**
 * Hard limits the GoFI agent can never exceed.
 *
 * These are not UI suggestions — they are compiled into WDK policies and
 * enforced inside the wallet layer, so any code path that tries to move funds
 * beyond them throws before a transaction is ever signed.
 */
export const DEFAULT_GUARDRAILS: Guardrails = {
  maxTransactionUsd: 100,
  maxDailyVolumeUsd: 250,
  allowedAssets: ["USDT", "ETH"],
  allowedProtocols: [],
  requireConfirmation: true,
};

/** Token contracts the agent is allowed to touch, lowercased for comparison. */
export const ALLOWED_TOKENS = new Set(
  [SEPOLIA_USDT.address].map((address) => address.toLowerCase())
);

/** Per-transaction cap for USDT, in base units (6 decimals). */
export const MAX_USDT_BASE_UNITS =
  BigInt(DEFAULT_GUARDRAILS.maxTransactionUsd) * 10n ** BigInt(SEPOLIA_USDT.decimals);

/**
 * Per-transaction cap for native ETH, in wei. Testnet ETH has no market price,
 * so this is a flat gas-money ceiling rather than a USD conversion.
 */
export const MAX_NATIVE_WEI = 50_000_000_000_000_000n; // 0.05 ETH

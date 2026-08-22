import "server-only";

import { getWdk } from "./client";
import { DEFAULT_NETWORK, type NetworkKey } from "./networks";

/** Our persisted status, narrower than WDK's finality levels. */
export type ChainStatus = "pending" | "confirmed" | "failed";

export type ChainOutcome = {
  status: ChainStatus;
  blockNumber: number | null;
  /** WDK's raw finality, kept for debugging: pending | confirmed | final | dropped. */
  finality: string;
  failureReason: string | null;
};

/**
 * Reads a transaction's current on-chain state.
 *
 * WDK reports four finality levels; the database stores three states. The
 * mapping is deliberate: `final` collapses into `confirmed` because GoFI does
 * not distinguish reorg depth, and a mined-but-reverted transaction is a
 * failure even though the chain considers it settled.
 */
export async function getChainOutcome(
  hash: string,
  network: NetworkKey = DEFAULT_NETWORK,
  index = 0
): Promise<ChainOutcome> {
  const account = await getWdk().getAccount(network, index);
  const receipt = await account.getTransaction(hash);

  const blockNumber = receipt.block ?? null;

  if (receipt.finality === "dropped") {
    return {
      status: "failed",
      blockNumber,
      finality: receipt.finality,
      failureReason: "Transaction was dropped from the mempool.",
    };
  }

  if (receipt.finality === "pending") {
    return {
      status: "pending",
      blockNumber,
      finality: receipt.finality,
      failureReason: null,
    };
  }

  // Mined. `success === false` means the EVM reverted it — settled, but failed.
  if (receipt.success === false) {
    return {
      status: "failed",
      blockNumber,
      finality: receipt.finality,
      failureReason: "Transaction was mined but reverted on-chain.",
    };
  }

  return {
    status: "confirmed",
    blockNumber,
    finality: receipt.finality,
    failureReason: null,
  };
}

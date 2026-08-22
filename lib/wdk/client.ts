import "server-only";

import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";

import { getServerEnv } from "@/lib/config/env";
import { buildGuardrailPolicies } from "@/lib/guardrails/policies";
import { NETWORKS, SEPOLIA } from "./networks";

/**
 * Single WDK instance for the whole server process.
 *
 * The seed lives here and nowhere else. Nothing under app/ may import this
 * module directly — only route handlers go through lib/wdk/account.ts and
 * lib/wdk/transfer.ts.
 *
 * Guardrails are registered on the instance itself, so every account derived
 * from it is a policy-enforced proxy. There is no code path that moves funds
 * without passing through them.
 */
let instance: WDK | null = null;

export function getWdk(): WDK {
  if (instance) return instance;

  const env = getServerEnv();

  instance = new WDK(env.WDK_SEED)
    .registerWallet(SEPOLIA, WalletManagerEvm, {
      provider: env.WDK_EVM_RPC_URLS,
      retries: env.WDK_EVM_RPC_URLS.length,
      chainId: NETWORKS[SEPOLIA].chainId,
    })
    .registerPolicy(buildGuardrailPolicies());

  return instance;
}

export function disposeWdk(): void {
  instance?.dispose();
  instance = null;
}

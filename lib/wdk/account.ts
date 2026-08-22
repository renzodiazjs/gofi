import "server-only";

import { getWdk } from "./client";
import { formatUnits } from "./format";
import { DEFAULT_NETWORK, NETWORKS, type NetworkKey } from "./networks";

export type Balance = {
  symbol: string;
  raw: string;
  formatted: string;
  decimals: number;
};

export type WalletSnapshot = {
  address: string;
  explorerUrl: string;
  network: {
    key: NetworkKey;
    displayName: string;
    chainId: number;
    testnet: boolean;
  };
  native: Balance;
  tokens: Balance[];
};

/**
 * Reads live on-chain state for a derived account. No mocks: every value comes
 * from the configured RPC provider.
 */
export async function getWalletSnapshot(
  network: NetworkKey = DEFAULT_NETWORK,
  index = 0
): Promise<WalletSnapshot> {
  const config = NETWORKS[network];
  const account = await getWdk().getAccount(network, index);

  const [address, nativeBalance, usdtBalance] = await Promise.all([
    account.getAddress(),
    account.getBalance(),
    account.getTokenBalance(config.tokens.USDT.address),
  ]);

  return {
    address,
    explorerUrl: config.explorerAddressUrl(address),
    network: {
      key: config.key,
      displayName: config.displayName,
      chainId: config.chainId,
      testnet: config.testnet,
    },
    native: {
      symbol: config.nativeSymbol,
      raw: nativeBalance.toString(),
      formatted: formatUnits(nativeBalance, config.nativeDecimals),
      decimals: config.nativeDecimals,
    },
    tokens: [
      {
        symbol: config.tokens.USDT.symbol,
        raw: usdtBalance.toString(),
        formatted: formatUnits(usdtBalance, config.tokens.USDT.decimals),
        decimals: config.tokens.USDT.decimals,
      },
    ],
  };
}

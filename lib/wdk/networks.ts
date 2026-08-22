/**
 * Network + token constants for GoFI.
 *
 * Every value here is taken from official WDK sources:
 *  - Sepolia RPC:   https://docs.wdk.tether.io/sdk/wallet-modules/wallet-evm/configuration
 *  - USDT contract: tetherto/wdk-cli `wdk.tokens.json` entry `sepolia/usdt`
 *
 * TESTNET ONLY. GoFI never targets mainnet.
 */

export const SEPOLIA_CHAIN_ID = 11155111;

/** Key used to register the wallet manager on the WDK instance. */
export const SEPOLIA = "sepolia" as const;

export type NetworkKey = typeof SEPOLIA;

export type TokenInfo = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

/**
 * Official Tether USDt test token on Ethereum Sepolia.
 * Not redeemable, no value — for testing WDK only.
 */
export const SEPOLIA_USDT: TokenInfo = {
  symbol: "USDT",
  address: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
  decimals: 6,
};

export const NETWORKS = {
  [SEPOLIA]: {
    key: SEPOLIA,
    displayName: "Ethereum Sepolia",
    chainId: SEPOLIA_CHAIN_ID,
    testnet: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    explorerTxUrl: (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`,
    explorerAddressUrl: (address: string) =>
      `https://sepolia.etherscan.io/address/${address}`,
    tokens: { USDT: SEPOLIA_USDT },
  },
} as const;

export const DEFAULT_NETWORK: NetworkKey = SEPOLIA;

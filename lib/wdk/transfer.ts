import "server-only";

import { getWdk } from "./client";
import { formatUnits, parseUnits } from "./format";
import { DEFAULT_NETWORK, NETWORKS, type NetworkKey } from "./networks";

export type TransferRequest = {
  to: string;
  /** Decimal amount, e.g. "1.5". */
  amount: string;
  network?: NetworkKey;
  index?: number;
};

export type TransferQuote = {
  token: string;
  recipient: string;
  amount: string;
  amountBaseUnits: string;
  fee: string;
  feeSymbol: string;
};

export type TransferReceipt = TransferQuote & {
  hash: string;
  explorerUrl: string;
};

function resolve(network: NetworkKey) {
  const config = NETWORKS[network];
  return { config, token: config.tokens.USDT };
}

/**
 * Prices a USDT transfer without signing anything. Guardrail policies are
 * evaluated on the write path only, so a quote can be shown to the user before
 * they approve.
 */
export async function quoteUsdtTransfer({
  to,
  amount,
  network = DEFAULT_NETWORK,
  index = 0,
}: TransferRequest): Promise<TransferQuote> {
  const { config, token } = resolve(network);
  const account = await getWdk().getAccount(network, index);
  const amountBaseUnits = parseUnits(amount, token.decimals);

  const quote = await account.quoteTransfer({
    token: token.address,
    recipient: to,
    amount: amountBaseUnits,
  });

  return {
    token: token.symbol,
    recipient: to,
    amount: formatUnits(amountBaseUnits, token.decimals),
    amountBaseUnits: amountBaseUnits.toString(),
    fee: formatUnits(BigInt(quote.fee), config.nativeDecimals),
    feeSymbol: config.nativeSymbol,
  };
}

/**
 * Executes a USDT transfer. Throws PolicyViolationError if a guardrail denies
 * it — the transaction is never signed in that case.
 */
export async function sendUsdtTransfer({
  to,
  amount,
  network = DEFAULT_NETWORK,
  index = 0,
}: TransferRequest): Promise<TransferReceipt> {
  const { config, token } = resolve(network);
  const account = await getWdk().getAccount(network, index);
  const amountBaseUnits = parseUnits(amount, token.decimals);

  const result = await account.transfer({
    token: token.address,
    recipient: to,
    amount: amountBaseUnits,
  });

  return {
    token: token.symbol,
    recipient: to,
    amount: formatUnits(amountBaseUnits, token.decimals),
    amountBaseUnits: amountBaseUnits.toString(),
    fee: formatUnits(BigInt(result.fee), config.nativeDecimals),
    feeSymbol: config.nativeSymbol,
    hash: result.hash,
    explorerUrl: config.explorerTxUrl(result.hash),
  };
}

export type NativeTransferRequest = {
  to: string;
  /** Decimal amount of the native coin, e.g. "0.0001". */
  amount: string;
  network?: NetworkKey;
  index?: number;
};

/** Prices a native transfer without signing. */
export async function quoteNativeTransfer({
  to,
  amount,
  network = DEFAULT_NETWORK,
  index = 0,
}: NativeTransferRequest): Promise<TransferQuote> {
  const { config } = resolve(network);
  const account = await getWdk().getAccount(network, index);
  const value = parseUnits(amount, config.nativeDecimals);

  const quote = await account.quoteSendTransaction({ to, value });

  return {
    token: config.nativeSymbol,
    recipient: to,
    amount: formatUnits(value, config.nativeDecimals),
    amountBaseUnits: value.toString(),
    fee: formatUnits(BigInt(quote.fee), config.nativeDecimals),
    feeSymbol: config.nativeSymbol,
  };
}

/**
 * Executes a native transfer. Guardrail policies gate `sendTransaction`, so an
 * over-cap value throws PolicyViolationError before anything is signed.
 */
export async function sendNativeTransfer({
  to,
  amount,
  network = DEFAULT_NETWORK,
  index = 0,
}: NativeTransferRequest): Promise<TransferReceipt> {
  const { config } = resolve(network);
  const account = await getWdk().getAccount(network, index);
  const value = parseUnits(amount, config.nativeDecimals);

  const result = await account.sendTransaction({ to, value });

  return {
    token: config.nativeSymbol,
    recipient: to,
    amount: formatUnits(value, config.nativeDecimals),
    amountBaseUnits: value.toString(),
    fee: formatUnits(BigInt(result.fee), config.nativeDecimals),
    feeSymbol: config.nativeSymbol,
    hash: result.hash,
    explorerUrl: config.explorerTxUrl(result.hash),
  };
}

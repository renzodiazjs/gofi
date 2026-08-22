/**
 * Generates a BIP-39 seed phrase for the shared GoFI TESTNET development wallet
 * and writes it into .env.local.
 *
 * The seed is NEVER printed. Only the derived Sepolia address is shown, so it
 * can be pasted into a faucet.
 *
 * Usage: pnpm wallet:new [--force]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";

const ENV_PATH = resolve(process.cwd(), ".env.local");
const EXAMPLE_PATH = resolve(process.cwd(), ".env.example");
const SEPOLIA_CHAIN_ID = 11155111;

const force = process.argv.includes("--force");

let contents = existsSync(ENV_PATH)
  ? readFileSync(ENV_PATH, "utf8")
  : readFileSync(EXAMPLE_PATH, "utf8");

const existing = contents.match(/^WDK_SEED="?([^"\n]*)"?$/m);
if (existing && existing[1].trim() && !force) {
  console.error(
    "WDK_SEED is already set in .env.local. Refusing to overwrite.\n" +
      "Re-run with --force only if you are sure nobody depends on that wallet."
  );
  process.exit(1);
}

const seedPhrase = WDK.getRandomSeedPhrase(24);
const line = `WDK_SEED="${seedPhrase}"`;

contents = /^WDK_SEED=.*$/m.test(contents)
  ? contents.replace(/^WDK_SEED=.*$/m, line)
  : `${contents.trimEnd()}\n${line}\n`;

writeFileSync(ENV_PATH, contents, { mode: 0o600 });

const wdk = new WDK(seedPhrase).registerWallet("sepolia", WalletManagerEvm, {
  chainId: SEPOLIA_CHAIN_ID,
});
const account = await wdk.getAccount("sepolia", 0);
const address = await account.getAddress();
wdk.dispose();

console.log("Development wallet created (TESTNET ONLY).");
console.log(`Seed written to .env.local — never commit or share it.`);
console.log("");
console.log(`Sepolia address: ${address}`);
console.log("");
console.log("Fund it:");
console.log("  ETH  -> https://www.alchemy.com/faucets/ethereum-sepolia");
console.log("  USDT -> https://faucet.candide.dev  /  https://faucet.pimlico.io");

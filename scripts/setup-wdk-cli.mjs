/**
 * Wires the local wdk-cli wallet store + Claude Code MCP server to the same
 * development wallet the Next.js app uses.
 *
 * Idempotent. Run after `pnpm wallet:new` (or after receiving .env.local from
 * a teammate).
 *
 * Usage: pnpm wdk:setup
 */
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env.local");
const WALLET_NAME = "gofi-dev";
// On Windows the pnpm shim is wdk.CMD, which only resolves through a shell.
const WIN = process.platform === "win32";

if (!existsSync(ENV_PATH)) {
  console.error("No .env.local found. Run `pnpm wallet:new` first.");
  process.exit(1);
}

let env = readFileSync(ENV_PATH, "utf8");

function read(key) {
  const match = env.match(new RegExp(`^${key}="?([^"\n]*)"?$`, "m"));
  return match?.[1]?.trim() ?? "";
}

const seed = read("WDK_SEED");
if (!seed) {
  console.error("WDK_SEED is empty in .env.local. Run `pnpm wallet:new` first.");
  process.exit(1);
}

let passphrase = read("WDK_CLI_PASSPHRASE");
if (!passphrase) {
  passphrase = randomBytes(24).toString("base64url");
  env =
    env.trimEnd() +
    "\n\n# Passphrase for the wdk-cli wallet store (MCP in Claude Code)\n" +
    `WDK_CLI_PASSPHRASE="${passphrase}"\n`;
  writeFileSync(ENV_PATH, env, { mode: 0o600 });
  console.log("Generated WDK_CLI_PASSPHRASE and stored it in .env.local.");
}

const wdkEnv = { ...process.env, WDK_PASSPHRASE: passphrase };

function wdk(args, options = {}) {
  return spawnSync("wdk", args, {
    env: wdkEnv,
    encoding: "utf8",
    shell: WIN,
    ...options,
  });
}

try {
  execFileSync("wdk", ["--version"], { stdio: "ignore", shell: WIN });
} catch {
  console.error(
    "`wdk` not found on PATH. Install it with:\n" +
      "  pnpm add -g @tetherto/wdk-cli\n" +
      "(run `pnpm setup` first if pnpm has no global bin dir)."
  );
  process.exit(1);
}

const wallets = wdk(["wallet", "list", "--json"]);
const alreadyImported = (wallets.stdout ?? "").includes(`"${WALLET_NAME}"`);

if (alreadyImported) {
  console.log(`Wallet "${WALLET_NAME}" already present in the wdk-cli store.`);
} else {
  const imported = wdk(
    ["wallet", "import", "--name", WALLET_NAME, "--seed-stdin", "--json"],
    { input: seed }
  );
  if (imported.status !== 0) {
    console.error(imported.stdout || imported.stderr);
    process.exit(1);
  }
  console.log(`Imported wallet "${WALLET_NAME}".`);
}

// An unlocked wallet is a signing oracle for anything that can reach the
// daemon, so it expires. `--ttl 0` would leave it unlocked until the machine
// reboots, which is the wrong default for a key that lives on a laptop.
// Override with WDK_UNLOCK_TTL_MINUTES when a long session is genuinely wanted.
const ttlMinutes = process.env.WDK_UNLOCK_TTL_MINUTES ?? "120";

const unlocked = wdk([
  "wallet",
  "unlock",
  "--name",
  WALLET_NAME,
  "--ttl",
  ttlMinutes,
  "--json",
]);
if (unlocked.status !== 0) {
  console.error(unlocked.stdout || unlocked.stderr);
  process.exit(1);
}
console.log(`Wallet unlocked for ${ttlMinutes} minutes.`);

const mcp = wdk(["mcp", "setup", "--ai-tool", "claude-code"], {
  stdio: "inherit",
});
if (mcp.status !== 0) process.exit(mcp.status ?? 1);

console.log("");
console.log("Done. Restart Claude Code to pick up the wdk-wallet MCP server.");

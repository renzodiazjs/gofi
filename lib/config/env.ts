import { z } from "zod";

const DEFAULT_SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://1rpc.io/sepolia",
].join(",");

/**
 * Server-only environment. Never import this from a client component.
 * Validation is lazy so `next build` does not require a populated .env.local.
 */
const serverEnvSchema = z.object({
  WDK_SEED: z
    .string()
    .min(1, "WDK_SEED is missing. Generate one with `pnpm wallet:new`."),
  /**
   * Comma-separated RPC endpoints. WDK fails over to the next one on error,
   * which matters because free Sepolia endpoints rate-limit aggressively.
   */
  WDK_EVM_RPC_URLS: z
    .string()
    .default(DEFAULT_SEPOLIA_RPCS)
    .transform((value) =>
      value
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.url()).min(1, "At least one RPC endpoint is required.")),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    WDK_SEED: process.env.WDK_SEED,
    WDK_EVM_RPC_URLS: process.env.WDK_EVM_RPC_URLS,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment — ${issues}`);
  }

  cached = parsed.data;
  return cached;
}

import { z } from "zod";

/**
 * Server-only environment. Never import this from a client component.
 * Validation is lazy so `next build` does not require a populated .env.local.
 */
const serverEnvSchema = z.object({
  WDK_SEED: z
    .string()
    .min(1, "WDK_SEED is missing. Generate one with `pnpm wallet:new`."),
  WDK_EVM_RPC_URL: z.url().default("https://sepolia.drpc.org"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    WDK_SEED: process.env.WDK_SEED,
    WDK_EVM_RPC_URL: process.env.WDK_EVM_RPC_URL,
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

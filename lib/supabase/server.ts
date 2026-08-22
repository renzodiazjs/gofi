import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";

/**
 * Server-side Supabase client backed by the secret key.
 *
 * The secret key bypasses RLS, which is exactly why this module is
 * `server-only` and why every table ships with RLS enabled and zero policies:
 * the browser cannot reach them at all, and this client is the single door in.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const env = getServerEnv();

  client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

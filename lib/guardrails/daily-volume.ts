import "server-only";

import { getSupabase } from "@/lib/supabase/server";

/**
 * USD₮ moved so far in the current UTC day.
 *
 * Counts pending rows as well as confirmed ones: a broadcast transaction has
 * already committed the funds, and excluding it would let someone spend past
 * the cap during the minute before it settles.
 *
 * Failed transactions are excluded — the chain rejected them, so nothing moved.
 */
export async function usdtVolumeToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data, error } = await getSupabase()
    .from("transactions")
    .select("amount")
    .eq("asset", "USDT")
    .in("status", ["pending", "confirmed"])
    .gte("created_at", startOfDay.toISOString());

  // Deliberately thrown rather than swallowed. The caller is a DENY policy
  // condition, and WDK treats a throwing DENY condition as a match — so an
  // unreadable ledger blocks the transfer instead of waving it through.
  if (error) {
    throw new Error(`usdtVolumeToday: ${error.message}`);
  }

  return (data ?? []).reduce(
    (total, row) => total + Number((row as { amount: number }).amount),
    0
  );
}

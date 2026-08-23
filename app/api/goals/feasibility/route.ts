import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeGoal } from "@/lib/ai/goal-analyzer";
import { financialGoalSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The verdict, and nothing else.
 *
 * Feasibility is compound interest — it costs a millisecond and involves no
 * model at all. Bundling it with strategy generation made the user wait forty
 * seconds for an answer that was ready immediately, so it is served on its own
 * and the slow half runs behind it.
 *
 * Nothing is persisted here: this is a calculation, not a commitment.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = financialGoalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  return NextResponse.json({ analysis: analyzeGoal(parsed.data) });
}

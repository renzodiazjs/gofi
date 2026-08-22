import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeGoal } from "@/lib/ai/goal-analyzer";
import { financialGoalSchema } from "@/lib/ai/schemas";
import { buildStrategy } from "@/lib/ai/strategy-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Analyze a goal without persisting anything.
 *
 * Lets a user see the feasibility verdict and a proposed strategy before
 * committing a goal — and keeps the whole analysis path testable without a
 * database.
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

  const goal = parsed.data;

  try {
    const analysis = analyzeGoal(goal);
    const strategy = await buildStrategy(goal, analysis);

    return NextResponse.json({ goal, analysis, strategy });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to analyze the goal.",
      },
      { status: 500 }
    );
  }
}

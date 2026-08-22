import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeGoal } from "@/lib/ai/goal-analyzer";
import { financialGoalSchema } from "@/lib/ai/schemas";
import { buildStrategy } from "@/lib/ai/strategy-builder";
import { createGoal, createStrategy, listGoals } from "@/lib/supabase/goals";
import { getWalletSnapshot } from "@/lib/wdk/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    return NextResponse.json({ goals: await listGoals() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list goals." },
      { status: 500 }
    );
  }
}

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
    // The arithmetic runs first and unconditionally — the model never gets to
    // disagree with it, and an unrealistic goal is still recorded honestly.
    const analysis = analyzeGoal(goal);
    const snapshot = await getWalletSnapshot();

    const row = await createGoal(goal, snapshot.address);
    const strategy = await buildStrategy(goal, analysis);
    const strategyRow = await createStrategy(row.id, analysis, strategy);

    return NextResponse.json({
      goal: row,
      analysis,
      strategy: strategyRow,
    });
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

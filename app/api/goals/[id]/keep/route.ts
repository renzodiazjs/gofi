import { NextResponse } from "next/server";

import { keepGoal } from "@/lib/supabase/goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keep a simulated goal.
 *
 * Analysing a goal is free and reversible, so it does not put anything in the
 * user's list. This is the moment they say the strategy is worth holding on to.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const goalId = Number((await params).id);

  if (!Number.isInteger(goalId) || goalId <= 0) {
    return NextResponse.json({ error: "Invalid goal id." }, { status: 400 });
  }

  try {
    return NextResponse.json({ goal: await keepGoal(goalId) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not keep this goal.",
      },
      { status: 500 }
    );
  }
}

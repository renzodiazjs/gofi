import { z } from "zod";

export const riskProfileSchema = z.enum([
  "conservative",
  "moderate",
  "aggressive",
]);

export const financialGoalSchema = z
  .object({
    initialCapital: z.number().positive().max(1_000_000),
    targetAmount: z.number().positive().max(10_000_000),
    timeHorizonMonths: z.number().int().min(1).max(120),
    riskProfile: riskProfileSchema,
  })
  .refine((goal) => goal.targetAmount > goal.initialCapital, {
    message: "targetAmount must be greater than initialCapital.",
    path: ["targetAmount"],
  });

export type FinancialGoalInput = z.infer<typeof financialGoalSchema>;

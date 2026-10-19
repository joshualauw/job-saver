import { z } from "zod";

/** Two answers only: something the posting does not show counts as "no", never as "unknown". */
const FIT_ANSWERS = ["yes", "no"] as const;
export type FitAnswer = (typeof FIT_ANSWERS)[number];

/**
 * What the model returns (strict structured output). Preferences are answered by their number in
 * the numbered list it was given, so their wording is never reproduced and cannot drift.
 */
export const assessmentAnswerSchema = z.object({
  preferences: z.array(z.object({ number: z.number().int(), answer: z.enum(FIT_ANSWERS) })),
});

export type AssessmentAnswer = z.infer<typeof assessmentAnswerSchema>;

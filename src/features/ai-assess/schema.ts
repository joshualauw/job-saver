import { z } from "zod";

import { fields } from "@/config/fields";
import type { JobFieldKey } from "@/config/fields";
import { enumValues } from "@/core/schema";

const VERDICT_KEY = "verdict" satisfies JobFieldKey;
const CV_FIT_KEY = "cvFit" satisfies JobFieldKey;

const verdictField = fields.find((field) => field.key === VERDICT_KEY);
if (!verdictField) throw new Error(`Field "${VERDICT_KEY}" is missing from the field list`);

/** The levels the verdict can take: the verdict field's options, never repeated here. */
export const verdictValues: readonly string[] = enumValues(verdictField);

/** Two answers only: something the posting or CV does not show counts as "no", never as "unknown". */
export const FIT_ANSWERS = ["yes", "no"] as const;
export type FitAnswer = (typeof FIT_ANSWERS)[number];

const fitAnswer = z.enum(FIT_ANSWERS);

/**
 * What the model returns (strict structured output). The CV fit is a list of marked bullets (empty
 * when there is no CV). Preferences are answered by their number in the numbered list it was
 * given, so their wording is never reproduced and cannot drift.
 */
export const assessmentAnswerSchema = z.object({
  [CV_FIT_KEY]: z.array(z.object({ answer: fitAnswer, text: z.string() })),
  preferences: z.array(z.object({ number: z.number().int(), answer: fitAnswer })),
  [VERDICT_KEY]: z.enum(enumValues(verdictField)),
});

export type AssessmentAnswer = z.infer<typeof assessmentAnswerSchema>;

/** Display label and position (lowest first) of a verdict value, from the verdict field's options. */
export function verdictLevel(value: string): { label: string; index: number; count: number } | null {
  const options = verdictField?.options ?? [];
  const index = options.findIndex((option) => option.value === value);
  const option = options[index];
  return option ? { label: option.label, index, count: options.length } : null;
}

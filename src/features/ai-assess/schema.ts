import { z } from "zod";

import { fields } from "@/config/fields";
import type { JobFieldKey } from "@/config/fields";
import { enumValues } from "@/core/schema";

const VERDICT_KEY = "verdict" satisfies JobFieldKey;

const verdictField = fields.find((field) => field.key === VERDICT_KEY);
if (!verdictField) throw new Error(`Field "${VERDICT_KEY}" is missing from the field list`);

/** The levels the verdict can take: the verdict field's options, never repeated here. */
export const verdictValues: readonly string[] = enumValues(verdictField);

export const PREFERENCE_ANSWERS = ["yes", "no", "not_stated"] as const;
export type PreferenceAnswer = (typeof PREFERENCE_ANSWERS)[number];

/**
 * What the model returns (strict structured output). Preferences are answered by their number in
 * the numbered list it was given, so their wording is never reproduced and cannot drift.
 */
export const assessmentAnswerSchema = z.object({
  cvFit: z.string().nullable(),
  preferences: z.array(z.object({ number: z.number().int(), answer: z.enum(PREFERENCE_ANSWERS) })),
  verdict: z.enum(enumValues(verdictField)),
});

export type AssessmentAnswer = z.infer<typeof assessmentAnswerSchema>;

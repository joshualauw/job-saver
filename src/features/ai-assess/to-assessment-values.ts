import type { AssessmentValues, JobFieldKey } from "@/config/fields";
import { SchemaError } from "@/core/errors";

import type { AssessmentAnswer, FitAnswer } from "./schema";

const PREFERENCE_FIT_KEY = "preferenceFit" satisfies JobFieldKey;

/** Every line starts with one of these, so the cell never begins with a character Sheets would evaluate. */
export const ANSWER_LABELS: Readonly<Record<FitAnswer, string>> = {
  yes: "Yes",
  no: "No",
};

export interface AssessedInput {
  readonly preferences: readonly string[];
}

/** One line per preference, in the user's order and with the user's own wording. */
function preferenceLines(answer: AssessmentAnswer, preferences: readonly string[]): string {
  const byNumber = new Map<number, FitAnswer>();
  for (const entry of answer.preferences) {
    if (byNumber.has(entry.number)) throw new SchemaError("The model answered the same preference twice. Try again.");
    byNumber.set(entry.number, entry.answer);
  }

  const lines = preferences.map((preference, index) => {
    const given = byNumber.get(index + 1);
    if (given === undefined) throw new SchemaError("The model's answer didn't cover every preference. Try again.");
    return `${ANSWER_LABELS[given]}: ${preference}`;
  });
  if (byNumber.size !== preferences.length) {
    throw new SchemaError("The model answered a preference that doesn't exist. Try again.");
  }
  return lines.join("\n");
}

/**
 * Turns the model's answer into field values. No preferences means no preference fit, whatever the
 * model wrote. A wrong shape throws rather than producing a silently wrong card.
 */
export function toAssessmentValues(answer: AssessmentAnswer, input: AssessedInput): AssessmentValues {
  return {
    [PREFERENCE_FIT_KEY]: input.preferences.length > 0 ? preferenceLines(answer, input.preferences) : null,
  };
}

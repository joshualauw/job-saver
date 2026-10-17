import type { AssessmentValues, JobFieldKey } from "@/config/fields";
import { SchemaError } from "@/core/errors";

import { verdictValues } from "./schema";
import type { AssessmentAnswer, PreferenceAnswer } from "./schema";

const CV_FIT_KEY = "cvFit" satisfies JobFieldKey;
const PREFERENCE_FIT_KEY = "preferenceFit" satisfies JobFieldKey;
const VERDICT_KEY = "verdict" satisfies JobFieldKey;

/** Every line starts with one of these, so the cell never begins with a character Sheets would evaluate. */
export const ANSWER_LABELS: Readonly<Record<PreferenceAnswer, string>> = {
  yes: "Yes",
  no: "No",
  not_stated: "Not stated",
};

export interface AssessedInput {
  readonly cv: string | null;
  readonly preferences: readonly string[];
}

function isVerdict(value: string): value is NonNullable<AssessmentValues["verdict"]> {
  return verdictValues.includes(value);
}

/** One line per preference, in the user's order and with the user's own wording. */
function preferenceLines(answer: AssessmentAnswer, preferences: readonly string[]): string {
  const byNumber = new Map<number, PreferenceAnswer>();
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
 * Turns the model's answer into field values. What the user did not provide is never filled in,
 * whatever the model wrote: no CV means no CV fit, no preferences means no preference fit. A
 * wrong shape throws rather than producing a silently wrong card.
 */
export function toAssessmentValues(answer: AssessmentAnswer, input: AssessedInput): AssessmentValues {
  if (!isVerdict(answer.verdict)) throw new SchemaError("The model gave an unknown verdict. Try again.");

  const cvFit = input.cv !== null ? (answer.cvFit?.trim() ?? "") : "";
  return {
    [CV_FIT_KEY]: cvFit === "" ? null : cvFit,
    [PREFERENCE_FIT_KEY]: input.preferences.length > 0 ? preferenceLines(answer, input.preferences) : null,
    [VERDICT_KEY]: answer.verdict,
  };
}

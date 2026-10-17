import type { FitAnswer } from "./schema";
import { ANSWER_LABELS } from "./to-assessment-values";

export interface FitLine {
  /** `null` for a line without a known prefix, such as one the user typed into the sheet. */
  readonly answer: FitAnswer | null;
  readonly text: string;
}

const PREFIXES = (Object.entries(ANSWER_LABELS) as [FitAnswer, string][]).map(
  ([answer, label]) => [answer, `${label}: `] as const,
);

/** The inverse of how `toAssessmentValues` writes the CV fit and preference fit cells. */
export function parseFitLines(text: string): FitLine[] {
  const lines: FitLine[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    const match = PREFIXES.find(([, prefix]) => line.startsWith(prefix));
    lines.push(match ? { answer: match[0], text: line.slice(match[1].length) } : { answer: null, text: line });
  }
  return lines;
}

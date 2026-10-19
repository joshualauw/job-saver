import { normalizeText } from "@/core/normalize";

import { truncateText } from "./truncate";

/** Length of a text as the model will see it, before the input cap (after whitespace cleanup). */
export function textLength(text: string | null): number {
  return normalizeText(text ?? "").length;
}

/** The model's input for a job text: whitespace cleaned, then capped to `maxChars`. */
export function prepareJobText(text: string, maxChars: number): string {
  return truncateText(normalizeText(text), maxChars);
}

import { normalizeText } from "@/core/normalize";
import type { PagePayload } from "@/core/page-payload";

import { truncateText } from "./truncate";

/** Length of a selection as the model will see it, before the input cap (after whitespace cleanup). */
export function selectionLength(selection: string | null): number {
  return normalizeText(selection ?? "").length;
}

/** The model's input for a highlighted text: whitespace cleaned, then capped to `maxChars`. */
export function buildSelectionPayload(selection: string, maxChars: number): PagePayload {
  return { description: truncateText(normalizeText(selection), maxChars) };
}

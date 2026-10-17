import { normalizeText } from "@/core/normalize";

/** Selections shorter than this are treated as accidental clicks, not a deliberate choice. */
export const MIN_SELECTION_CHARS = 40;

/** Length of a highlighted text as the extractor will see it (after whitespace cleanup). */
export function selectionLength(selection: string | null): number {
  return normalizeText(selection ?? "").length;
}

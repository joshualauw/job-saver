import { MIN_SELECTION_CHARS } from "@/features/page-extract/selection";

/** Analyze button text: shows the highlight size once it is long enough for the extractor to use it. */
export function analyzeLabel(selectionLength: number): string {
  if (selectionLength < MIN_SELECTION_CHARS) return "Analyze this page";
  return `Analyze ${selectionLength.toLocaleString("en-US")} selected characters`;
}

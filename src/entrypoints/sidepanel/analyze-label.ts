import { MIN_SELECTION_CHARS } from "@/features/page-extract/selection";

/**
 * Analyze button text: shows the highlight size once it is long enough for the extractor to use it,
 * and says "Re-analyze" when the job is already in the sheet.
 */
export function analyzeLabel(selectionLength: number, replacing = false): string {
  const verb = replacing ? "Re-analyze" : "Analyze";
  if (selectionLength < MIN_SELECTION_CHARS) return `${verb} this page`;
  return `${verb} ${selectionLength.toLocaleString("en-US")} selected characters`;
}

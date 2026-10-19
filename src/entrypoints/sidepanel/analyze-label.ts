import { selectionLength } from "@/features/selection-capture/build-payload";

/** Analyze button text: shows how much text will be sent once some has been selected. */
export function analyzeLabel(selection: string | null): string {
  const length = selectionLength(selection);
  return length === 0 ? "Analyze" : `Analyze ${length.toLocaleString("en-US")} characters`;
}

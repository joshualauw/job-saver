export const TRUNCATION_MARKER = "\n[…truncated]";

/**
 * Caps `text` at `maxChars` (marker included), preferring to cut at a line or sentence
 * boundary so the model never sees a half-word. Keeps the head, which is where job ads state
 * the role; keyword-aware truncation is not needed at current ad sizes.
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= TRUNCATION_MARKER.length) return text.slice(0, Math.max(0, maxChars));

  const budget = maxChars - TRUNCATION_MARKER.length;
  const head = text.slice(0, budget);
  const boundary = Math.max(head.lastIndexOf("\n"), head.lastIndexOf(". ") + 1);
  // Don't throw away more than half the budget just to land on a boundary.
  const cut = boundary >= budget / 2 ? boundary : budget;
  return head.slice(0, cut).trimEnd() + TRUNCATION_MARKER;
}

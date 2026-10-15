/** Separator used when a list is stored in a single sheet cell. */
export const LIST_SEPARATOR = ", ";

/**
 * Canonical form for list entries such as skills: trimmed, whitespace collapsed, lowercase,
 * no empties, no duplicates (first occurrence wins, order kept).
 */
export function normalizeList(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.trim().replace(/\s+/g, " ").toLowerCase();
    if (normalized === "" || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function joinList(items: readonly string[]): string {
  return normalizeList(items).join(LIST_SEPARATOR);
}

/** Inverse of `joinList`; tolerant of a missing space after the comma. */
export function splitList(text: string): string[] {
  return normalizeList(text.split(","));
}

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

/** Tidies raw text: trims lines, drops empty runs (max one blank line), keeps bullets on one line. */
export function normalizeText(raw: string): string {
  const lines = raw
    .replace(/(^|\n)- [ \t]*\n+/g, "$1- ")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim());

  const kept: string[] = [];
  for (const line of lines) {
    if (line === "" && (kept.length === 0 || kept[kept.length - 1] === "")) continue;
    kept.push(line);
  }
  while (kept[kept.length - 1] === "") kept.pop();

  // Keep a bullet list tight: `<li><p>…</p></li>` would otherwise leave a blank line between items.
  return kept
    .filter((line, index) => {
      if (line !== "") return true;
      return !(kept[index - 1]?.startsWith("- ") && kept[index + 1]?.startsWith("- "));
    })
    .join("\n");
}

/** Zero-based column index → spreadsheet column letters (0 → A, 25 → Z, 26 → AA). */
export function columnLetter(index: number): string {
  let rest = index + 1;
  let letters = "";
  while (rest > 0) {
    const remainder = (rest - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    rest = Math.floor((rest - 1) / 26);
  }
  return letters;
}

/** Quotes a tab name for A1 notation: `Jobs` → `'Jobs'`, `Bob's` → `'Bob''s'`. */
export function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

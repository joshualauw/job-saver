/**
 * A written row as the Sheets API would hand it back: the leading apostrophe that marks a cell as
 * text is a storage hint, not part of the value, so a read never includes it.
 */
export function asSheetReturns<T extends string | number>(row: readonly T[]): (string | number)[] {
  return row.map((cell) => (typeof cell === "string" && cell.startsWith("'") ? cell.slice(1) : cell));
}

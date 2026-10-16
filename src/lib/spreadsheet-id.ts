const URL_ID = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;
const BARE_ID = /^[a-zA-Z0-9_-]{20,}$/;

/** Accepts a pasted spreadsheet URL or a bare ID; `null` when it looks like neither. */
export function parseSpreadsheetId(input: string): string | null {
  const text = input.trim();
  const fromUrl = URL_ID.exec(text)?.[1];
  if (fromUrl) return fromUrl;
  return BARE_ID.test(text) ? text : null;
}

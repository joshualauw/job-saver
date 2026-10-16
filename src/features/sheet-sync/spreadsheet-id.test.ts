import { describe, expect, it } from "vitest";

import { parseSpreadsheetId } from "./spreadsheet-id";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abc";

describe("parseSpreadsheetId", () => {
  it("extracts the ID from a pasted sheet URL", () => {
    expect(parseSpreadsheetId(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`)).toBe(ID);
    expect(parseSpreadsheetId(`  https://docs.google.com/spreadsheets/d/${ID}  `)).toBe(ID);
  });

  it("accepts a bare ID", () => {
    expect(parseSpreadsheetId(ID)).toBe(ID);
  });

  it("rejects anything else", () => {
    expect(parseSpreadsheetId("")).toBeNull();
    expect(parseSpreadsheetId("jobs")).toBeNull();
    expect(parseSpreadsheetId("https://example.com/not-a-sheet")).toBeNull();
    expect(parseSpreadsheetId("has spaces in it but is long enough to pass")).toBeNull();
  });
});

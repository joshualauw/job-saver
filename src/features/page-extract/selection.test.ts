import { describe, expect, it } from "vitest";

import { selectionLength } from "./selection";

describe("selectionLength", () => {
  it("is 0 for no selection", () => {
    expect(selectionLength(null)).toBe(0);
    expect(selectionLength("")).toBe(0);
    expect(selectionLength("  \n\n ")).toBe(0);
  });

  it("counts the cleaned text, like the extractor does", () => {
    expect(selectionLength("  Must   know\n\n\n\nPostgres  ")).toBe("Must know\n\nPostgres".length);
  });
});

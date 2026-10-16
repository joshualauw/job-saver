import { describe, expect, it } from "vitest";

import { columnLetter, quoteTab } from "./a1-notation";

describe("columnLetter", () => {
  it.each([
    [0, "A"],
    [1, "B"],
    [25, "Z"],
    [26, "AA"],
    [27, "AB"],
    [51, "AZ"],
    [52, "BA"],
    [701, "ZZ"],
    [702, "AAA"],
  ])("maps index %i to %s", (index, letters) => {
    expect(columnLetter(index)).toBe(letters);
  });
});

describe("quoteTab", () => {
  it("quotes a tab name and escapes embedded quotes", () => {
    expect(quoteTab("Jobs")).toBe("'Jobs'");
    expect(quoteTab("Bob's jobs")).toBe("'Bob''s jobs'");
  });
});

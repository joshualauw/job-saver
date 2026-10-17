import { describe, expect, it } from "vitest";

import { formatPreferences, parsePreferences } from "./parse-preferences";

describe("parsePreferences", () => {
  it("trims lines, drops blanks and collapses inner spaces", () => {
    expect(parsePreferences("  Remote work \n\n   \nSalary   above 10M\r\n")).toEqual({
      ok: true,
      preferences: ["Remote work", "Salary above 10M"],
    });
  });

  it("removes repeats regardless of case, keeping the first", () => {
    expect(parsePreferences("Remote\nremote\nREMOTE\nHybrid")).toEqual({ ok: true, preferences: ["Remote", "Hybrid"] });
  });

  it("is empty for blank input", () => {
    expect(parsePreferences(" \n ")).toEqual({ ok: true, preferences: [] });
  });

  it("refuses more than the limit", () => {
    const result = parsePreferences("a\nb\nc", 2);
    expect(result).toEqual({ ok: false, error: "Keep it to 2 preferences or fewer." });
  });
});

describe("formatPreferences", () => {
  it("joins one per line, and handles none", () => {
    expect(formatPreferences(["a", "b"])).toBe("a\nb");
    expect(formatPreferences(undefined)).toBe("");
  });
});

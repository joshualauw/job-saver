import { describe, expect, it } from "vitest";

import { TRUNCATION_MARKER, truncateText } from "./truncate";

describe("truncateText", () => {
  it("returns text within budget unchanged", () => {
    expect(truncateText("short text", 100)).toBe("short text");
    expect(truncateText("exact", 5)).toBe("exact");
  });

  it("never exceeds the budget, marker included", () => {
    const result = truncateText("word ".repeat(200), 120);
    expect(result.length).toBeLessThanOrEqual(120);
    expect(result.endsWith(TRUNCATION_MARKER)).toBe(true);
  });

  it("prefers a line boundary", () => {
    const max = TRUNCATION_MARKER.length + 10;
    expect(truncateText("line one\nline two\nline three", max)).toBe(`line one${TRUNCATION_MARKER}`);
  });

  it("prefers a sentence boundary when there is no line break", () => {
    const max = TRUNCATION_MARKER.length + 20;
    expect(truncateText("First one. Second sentence here and more.", max)).toBe(`First one.${TRUNCATION_MARKER}`);
  });

  it("falls back to a hard cut when no boundary keeps enough text", () => {
    const result = truncateText("x".repeat(100), 30);
    expect(result).toBe(`${"x".repeat(30 - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}`);
  });

  it("handles a budget smaller than the marker", () => {
    expect(truncateText("abcdefghijklmnopqrstuvwxyz", 5)).toBe("abcde");
    expect(truncateText("abc", 0)).toBe("");
  });
});

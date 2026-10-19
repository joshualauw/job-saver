import { describe, expect, it } from "vitest";

import { analyzeLabel } from "./analyze-label";

describe("analyzeLabel", () => {
  it("stays plain when nothing has been sent", () => {
    expect(analyzeLabel(null)).toBe("Analyze");
    expect(analyzeLabel("   ")).toBe("Analyze");
  });

  it("shows how much text will be analyzed, after whitespace cleanup", () => {
    expect(analyzeLabel("a".repeat(1234))).toBe("Analyze 1,234 characters");
    expect(analyzeLabel("  one   two  ")).toBe("Analyze 7 characters");
  });
});

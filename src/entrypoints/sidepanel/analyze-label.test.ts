import { describe, expect, it } from "vitest";

import { analyzeLabel } from "./analyze-label";

describe("analyzeLabel", () => {
  it("stays generic with no selection or an accidental one", () => {
    expect(analyzeLabel(0)).toBe("Analyze this page");
    expect(analyzeLabel(39)).toBe("Analyze this page");
  });

  it("shows the size once the extractor would use the selection", () => {
    expect(analyzeLabel(40)).toBe("Analyze 40 selected characters");
    expect(analyzeLabel(1234)).toBe("Analyze 1,234 selected characters");
  });

  it("says re-analyze when the job is already in the sheet", () => {
    expect(analyzeLabel(0, true)).toBe("Re-analyze this page");
    expect(analyzeLabel(39, true)).toBe("Re-analyze this page");
    expect(analyzeLabel(1234, true)).toBe("Re-analyze 1,234 selected characters");
  });
});

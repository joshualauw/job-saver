import { describe, expect, it } from "vitest";

import { buildSelectionPayload, selectionLength } from "./build-payload";
import { TRUNCATION_MARKER } from "./truncate";

describe("selectionLength", () => {
  it("counts the text as the model will see it, not the raw highlight", () => {
    expect(selectionLength("  Build   things.\n\n\n\nWith care.  ")).toBe("Build things.\n\nWith care.".length);
  });

  it("is 0 for nothing", () => {
    expect(selectionLength(null)).toBe(0);
    expect(selectionLength("   ")).toBe(0);
  });
});

describe("buildSelectionPayload", () => {
  it("cleans whitespace and keeps the text as the description", () => {
    expect(buildSelectionPayload("  Build   things.  ", 1000)).toEqual({ description: "Build things." });
  });

  it("caps long text, marking the cut", () => {
    const { description } = buildSelectionPayload("word ".repeat(500), 100);
    expect(description.length).toBeLessThanOrEqual(100);
    expect(description.endsWith(TRUNCATION_MARKER)).toBe(true);
  });
});

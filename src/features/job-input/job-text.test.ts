import { describe, expect, it } from "vitest";

import { prepareJobText, textLength } from "./job-text";
import { TRUNCATION_MARKER } from "./truncate";

describe("textLength", () => {
  it("counts the text as the model will see it, not the raw highlight", () => {
    expect(textLength("  Build   things.\n\n\n\nWith care.  ")).toBe("Build things.\n\nWith care.".length);
  });

  it("is 0 for nothing", () => {
    expect(textLength(null)).toBe(0);
    expect(textLength("   ")).toBe(0);
  });
});

describe("prepareJobText", () => {
  it("cleans whitespace", () => {
    expect(prepareJobText("  Build   things.  ", 1000)).toBe("Build things.");
  });

  it("caps long text, marking the cut", () => {
    const description = prepareJobText("word ".repeat(500), 100);
    expect(description.length).toBeLessThanOrEqual(100);
    expect(description.endsWith(TRUNCATION_MARKER)).toBe(true);
  });
});

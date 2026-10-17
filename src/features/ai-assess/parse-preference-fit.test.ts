import { describe, expect, it } from "vitest";

import { parsePreferenceFit } from "./parse-preference-fit";
import { toAssessmentValues } from "./to-assessment-values";

describe("parsePreferenceFit", () => {
  it("splits each line into its answer and the preference", () => {
    expect(parsePreferenceFit("Yes: Remote work\nNo: Salary above 10M\nNot stated: Four day week")).toEqual([
      { answer: "yes", text: "Remote work" },
      { answer: "no", text: "Salary above 10M" },
      { answer: "not_stated", text: "Four day week" },
    ]);
  });

  it("keeps a line without a known prefix as a plain line, and skips blanks", () => {
    expect(parsePreferenceFit("\nMaybe: Remote\n  \nYes: A")).toEqual([
      { answer: null, text: "Maybe: Remote" },
      { answer: "yes", text: "A" },
    ]);
  });

  it("is empty for empty text", () => {
    expect(parsePreferenceFit("")).toEqual([]);
  });

  it("reads back exactly what the builder wrote", () => {
    const preferences = ["Remote work", "=Four day week", "Salary: above 10M"];
    const values = toAssessmentValues(
      {
        cvFit: null,
        preferences: [
          { number: 1, answer: "no" },
          { number: 2, answer: "yes" },
          { number: 3, answer: "not_stated" },
        ],
        verdict: "medium",
      },
      { cv: null, preferences },
    );
    expect(parsePreferenceFit(values.preferenceFit ?? "").map((line) => line.text)).toEqual(preferences);
  });
});

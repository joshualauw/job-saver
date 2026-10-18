import { describe, expect, it } from "vitest";

import { SchemaError } from "@/core/errors";

import type { AssessmentAnswer } from "./schema";
import { toAssessmentValues } from "./to-assessment-values";

const answer: AssessmentAnswer = {
  preferences: [
    { number: 2, answer: "no" },
    { number: 1, answer: "yes" },
    { number: 3, answer: "no" },
  ],
};

const input = { preferences: ["Remote work", "Salary above 10M", "=Four day week"] };

describe("toAssessmentValues", () => {
  it("builds one prefixed line per preference, in the user's order and wording", () => {
    expect(toAssessmentValues(answer, input)).toEqual({
      preferenceFit: "Yes: Remote work\nNo: Salary above 10M\nNo: =Four day week",
    });
  });

  it("never starts the cell with a character Sheets would evaluate", () => {
    const values = toAssessmentValues({ preferences: [{ number: 1, answer: "yes" }] }, { preferences: ["=SUM(A1)"] });
    expect(values.preferenceFit?.[0]).toBe("Y");
  });

  it("has no preference fit when there are no preferences, whatever the model wrote", () => {
    expect(toAssessmentValues(answer, { preferences: [] }).preferenceFit).toBeNull();
  });

  it.each([
    [
      "a missing preference",
      [
        { number: 1, answer: "yes" },
        { number: 2, answer: "no" },
      ],
    ],
    [
      "a repeated preference",
      [
        { number: 1, answer: "yes" },
        { number: 1, answer: "no" },
        { number: 3, answer: "yes" },
      ],
    ],
    [
      "an out-of-range number",
      [
        { number: 1, answer: "yes" },
        { number: 2, answer: "no" },
        { number: 4, answer: "yes" },
      ],
    ],
    ["an extra preference", [...answer.preferences, { number: 4, answer: "yes" }]],
  ] as const)("rejects %s", (_label, preferences) => {
    expect(() => toAssessmentValues({ preferences: [...preferences] }, input)).toThrow(SchemaError);
  });
});

import { describe, expect, it } from "vitest";

import { appConfig } from "@/config/app";
import { SchemaError } from "@/core/errors";

import type { AssessmentAnswer } from "./schema";
import { toAssessmentValues } from "./to-assessment-values";

const answer: AssessmentAnswer = {
  cvFit: [
    { answer: "yes", text: "  Matches Node.js and Postgres  " },
    { answer: "no", text: "Needs 5 years,\n  CV shows 2" },
  ],
  preferences: [
    { number: 2, answer: "no" },
    { number: 1, answer: "yes" },
    { number: 3, answer: "no" },
  ],
  verdict: "high",
};

const input = { cv: "My CV", preferences: ["Remote work", "Salary above 10M", "=Four day week"] };

describe("toAssessmentValues", () => {
  it("builds one prefixed line per preference, in the user's order and wording", () => {
    const values = toAssessmentValues(answer, input);
    expect(values.preferenceFit).toBe("Yes: Remote work\nNo: Salary above 10M\nNo: =Four day week");
    expect(values.verdict).toBe("high");
  });

  it("builds one prefixed line per CV bullet, each collapsed to a single line", () => {
    expect(toAssessmentValues(answer, input).cvFit).toBe(
      "Yes: Matches Node.js and Postgres\nNo: Needs 5 years, CV shows 2",
    );
  });

  it("keeps only the first bullets up to the configured limit, and drops blank ones", () => {
    const many = Array.from({ length: appConfig.maxCvFitLines + 3 }, (_, index) => ({
      answer: "yes" as const,
      text: `Point ${index + 1}`,
    }));
    const cvFit = toAssessmentValues({ ...answer, cvFit: [{ answer: "no", text: "  " }, ...many] }, input).cvFit;
    expect(cvFit?.split("\n")).toHaveLength(appConfig.maxCvFitLines);
    expect(cvFit?.startsWith("Yes: Point 1\n")).toBe(true);
  });

  it("never starts a cell with a character Sheets would evaluate", () => {
    const values = toAssessmentValues(
      { ...answer, cvFit: [{ answer: "yes", text: "=SUM(A1)" }], preferences: [{ number: 1, answer: "yes" }] },
      { cv: "My CV", preferences: ["=SUM(A1)"] },
    );
    expect(values.preferenceFit?.[0]).toBe("Y");
    expect(values.cvFit?.[0]).toBe("Y");
  });

  it("has no CV fit when no CV was provided, whatever the model wrote", () => {
    expect(toAssessmentValues(answer, { ...input, cv: null }).cvFit).toBeNull();
  });

  it("has no CV fit when the model returned nothing usable for it", () => {
    expect(toAssessmentValues({ ...answer, cvFit: [] }, input).cvFit).toBeNull();
    expect(toAssessmentValues({ ...answer, cvFit: [{ answer: "yes", text: "   " }] }, input).cvFit).toBeNull();
  });

  it("has no preference fit when there are no preferences, whatever the model wrote", () => {
    expect(toAssessmentValues(answer, { cv: "My CV", preferences: [] }).preferenceFit).toBeNull();
  });

  it("still gives a verdict with only a CV, or only preferences", () => {
    const onlyCv = toAssessmentValues({ ...answer, preferences: [] }, { cv: "My CV", preferences: [] });
    expect(onlyCv).toEqual({
      cvFit: "Yes: Matches Node.js and Postgres\nNo: Needs 5 years, CV shows 2",
      preferenceFit: null,
      verdict: "high",
    });

    const onlyPrefs = toAssessmentValues({ ...answer, cvFit: [] }, { cv: null, preferences: input.preferences });
    expect(onlyPrefs.cvFit).toBeNull();
    expect(onlyPrefs.verdict).toBe("high");
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
    expect(() => toAssessmentValues({ ...answer, preferences: [...preferences] }, input)).toThrow(SchemaError);
  });

  it("rejects an unknown verdict", () => {
    expect(() => toAssessmentValues({ ...answer, verdict: "great" }, input)).toThrow(SchemaError);
  });
});

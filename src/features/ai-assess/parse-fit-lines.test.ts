import { describe, expect, it } from "vitest";

import { parseFitLines } from "./parse-fit-lines";
import { toAssessmentValues } from "./to-assessment-values";

describe("parseFitLines", () => {
  it("splits each line into its answer and the text", () => {
    expect(parseFitLines("Yes: Remote work\nNo: Salary above 10M")).toEqual([
      { answer: "yes", text: "Remote work" },
      { answer: "no", text: "Salary above 10M" },
    ]);
  });

  it("keeps a line without a known prefix as a plain line, and skips blanks", () => {
    expect(parseFitLines("\nMaybe: Remote\n  \nYes: A\nNot stated: Four day week")).toEqual([
      { answer: null, text: "Maybe: Remote" },
      { answer: "yes", text: "A" },
      { answer: null, text: "Not stated: Four day week" },
    ]);
  });

  it("shows an old paragraph CV fit as one plain line", () => {
    expect(parseFitLines("Strong match on the backend stack.")).toEqual([
      { answer: null, text: "Strong match on the backend stack." },
    ]);
  });

  it("is empty for empty text", () => {
    expect(parseFitLines("")).toEqual([]);
  });

  it("reads back exactly what the builder wrote", () => {
    const preferences = ["Remote work", "=Four day week", "Salary: above 10M"];
    const values = toAssessmentValues(
      {
        cvFit: [
          { answer: "yes", text: "Matches Node.js and Postgres" },
          { answer: "no", text: "=Needs 5 years" },
        ],
        preferences: [
          { number: 1, answer: "no" },
          { number: 2, answer: "yes" },
          { number: 3, answer: "no" },
        ],
        verdict: "medium",
      },
      { cv: "My CV", preferences },
    );
    expect(parseFitLines(values.preferenceFit ?? "").map((line) => line.text)).toEqual(preferences);
    expect(parseFitLines(values.cvFit ?? "")).toEqual([
      { answer: "yes", text: "Matches Node.js and Postgres" },
      { answer: "no", text: "=Needs 5 years" },
    ]);
  });
});

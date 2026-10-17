import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fields } from "@/config/fields";

import { assessmentAnswerSchema, verdictValues } from "./schema";

describe("verdictValues", () => {
  it("are exactly the verdict field's options", () => {
    const options = fields.find((field) => field.key === "verdict")?.options?.map((option) => option.value);
    expect(verdictValues).toEqual(options);
    expect(verdictValues).toEqual(["low", "medium", "high", "very_high"]);
  });
});

describe("assessmentAnswerSchema", () => {
  const valid = {
    cvFit: [{ answer: "yes", text: "Matches Node.js" }],
    preferences: [{ number: 1, answer: "yes" }],
    verdict: "high",
  };

  it("accepts a complete answer, with an empty CV fit list", () => {
    expect(assessmentAnswerSchema.safeParse(valid).success).toBe(true);
    expect(assessmentAnswerSchema.safeParse({ ...valid, cvFit: [] }).success).toBe(true);
  });

  it("rejects a CV fit that is not a list", () => {
    expect(assessmentAnswerSchema.safeParse({ ...valid, cvFit: "Good match." }).success).toBe(false);
    expect(assessmentAnswerSchema.safeParse({ ...valid, cvFit: null }).success).toBe(false);
  });

  it("rejects an unknown verdict, and any answer other than yes or no", () => {
    expect(assessmentAnswerSchema.safeParse({ ...valid, verdict: "great" }).success).toBe(false);
    for (const answer of ["maybe", "not_stated", "unclear"]) {
      expect(assessmentAnswerSchema.safeParse({ ...valid, preferences: [{ number: 1, answer }] }).success).toBe(false);
      expect(assessmentAnswerSchema.safeParse({ ...valid, cvFit: [{ answer, text: "x" }] }).success).toBe(false);
    }
  });

  it("is a strict-mode JSON schema with every key required and no extras", () => {
    const json = z.toJSONSchema(assessmentAnswerSchema) as { required: string[]; additionalProperties: boolean };
    expect([...json.required].sort()).toEqual(["cvFit", "preferences", "verdict"]);
    expect(json.additionalProperties).toBe(false);
  });
});

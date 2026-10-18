import { describe, expect, it } from "vitest";
import { z } from "zod";

import { assessmentAnswerSchema } from "./schema";

describe("assessmentAnswerSchema", () => {
  const valid = { preferences: [{ number: 1, answer: "yes" }] };

  it("accepts a complete answer, and an empty list", () => {
    expect(assessmentAnswerSchema.safeParse(valid).success).toBe(true);
    expect(assessmentAnswerSchema.safeParse({ preferences: [] }).success).toBe(true);
  });

  it("rejects any answer other than yes or no", () => {
    for (const answer of ["maybe", "not_stated", "unclear"]) {
      expect(assessmentAnswerSchema.safeParse({ preferences: [{ number: 1, answer }] }).success).toBe(false);
    }
  });

  it("is a strict-mode JSON schema with every key required and no extras", () => {
    const json = z.toJSONSchema(assessmentAnswerSchema) as { required: string[]; additionalProperties: boolean };
    expect(json.required).toEqual(["preferences"]);
    expect(json.additionalProperties).toBe(false);
  });
});

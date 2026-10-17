import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fields, jobFormSchema, jobLlmSchema } from "@/config/fields";
import type { JobValues } from "@/config/fields";

import { buildFormSchema, buildLlmSchema } from "./schema";

const validJob: JobValues = {
  company: "Acme",
  jobTitle: "Backend Engineer",
  address: null,
  contractType: "full_time",
  locationType: "hybrid",
  platform: "Jobstreet",
  jobUrl: "https://id.jobstreet.com/id/job/12345678",
  status: "saved",
  appliedAt: null,
  lastUpdatedAt: null,
  minYoe: 3,
  skills: ["node.js", "postgres"],
  salaryPeriod: "month",
  salaryCurrency: "IDR",
  minSalary: 8_000_000,
  maxSalary: 12_000_000,
  summary: "Builds APIs.",
  notes: null,
  cvFit: null,
  preferenceFit: null,
  verdict: null,
};

describe("buildFormSchema", () => {
  it("accepts a complete valid job", () => {
    expect(jobFormSchema.safeParse(validJob).success).toBe(true);
  });

  it("rejects blank required fields", () => {
    expect(jobFormSchema.safeParse({ ...validJob, company: "   " }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...validJob, jobUrl: "" }).success).toBe(false);
  });

  it("allows null only on nullable fields", () => {
    expect(jobFormSchema.safeParse({ ...validJob, minSalary: null }).success).toBe(true);
    expect(jobFormSchema.safeParse({ ...validJob, company: null }).success).toBe(false);
  });

  it("rejects values outside an enum", () => {
    expect(jobFormSchema.safeParse({ ...validJob, status: "dreaming" }).success).toBe(false);
  });

  it("rejects malformed and impossible dates", () => {
    expect(jobFormSchema.safeParse({ ...validJob, appliedAt: "15/10/2026" }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...validJob, appliedAt: "2026-02-31" }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...validJob, appliedAt: "2026-10-15" }).success).toBe(true);
  });

  it("rejects negative salaries", () => {
    expect(jobFormSchema.safeParse({ ...validJob, minSalary: -1 }).success).toBe(false);
  });

  it("normalises skills to lowercase, trimmed, unique entries", () => {
    const parsed = jobFormSchema.safeParse({
      ...validJob,
      skills: ["Node.js", " TypeScript ", "typescript", "", "Postgres"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.skills).toEqual(["node.js", "typescript", "postgres"]);
    }
  });

  it("accepts an empty skills list but not null or a plain string", () => {
    expect(jobFormSchema.safeParse({ ...validJob, skills: [] }).success).toBe(true);
    expect(jobFormSchema.safeParse({ ...validJob, skills: null }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...validJob, skills: "node.js, postgres" }).success).toBe(false);
  });

  it("can require a non-empty list", () => {
    const schema = buildFormSchema([
      { key: "tags", column: "Tags", label: "Tags", type: "stringList", source: "user", required: true },
    ] as const);
    expect(schema.safeParse({ tags: [] }).success).toBe(false);
    expect(schema.safeParse({ tags: [" "] }).success).toBe(false);
    expect(schema.safeParse({ tags: ["a"] }).success).toBe(true);
  });

  it("throws on an enum field without options", () => {
    expect(() =>
      buildFormSchema([{ key: "x", column: "X", label: "X", type: "enum", source: "user" }] as const),
    ).toThrow(/no options/);
  });
});

describe("buildLlmSchema", () => {
  const aiFields = fields.filter((field) => field.source === "ai");
  const aiKeys = aiFields.map((field) => field.key);
  // "Nothing found": null for scalars, an empty array for lists.
  const nothingFound = Object.fromEntries(
    aiFields.map((field) => [field.key, field.type === "stringList" ? [] : null]),
  );

  it("contains only AI-sourced fields", () => {
    const parsed = jobLlmSchema.safeParse(nothingFound);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(Object.keys(parsed.data).sort()).toEqual([...aiKeys].sort());
    }
  });

  it("makes scalar fields nullable and requires every key to be present", () => {
    expect(jobLlmSchema.safeParse(nothingFound).success).toBe(true);

    const missingCompany = Object.fromEntries(Object.entries(nothingFound).filter(([key]) => key !== "company"));
    expect(jobLlmSchema.safeParse(missingCompany).success).toBe(false);
  });

  it("represents 'no skills' as an empty array, never null", () => {
    expect(jobLlmSchema.safeParse({ ...nothingFound, skills: ["node.js"] }).success).toBe(true);
    expect(jobLlmSchema.safeParse({ ...nothingFound, skills: null }).success).toBe(false);
  });

  it("does not normalise skills itself (the form schema does that)", () => {
    const parsed = jobLlmSchema.safeParse({ ...nothingFound, skills: ["Node.js"] });
    expect(parsed.success && parsed.data.skills).toEqual(["Node.js"]);
  });

  it("does not require non-empty strings (that is a save-time rule)", () => {
    const schema = buildLlmSchema([
      { key: "name", column: "Name", label: "Name", type: "string", source: "ai", required: true },
    ] as const);
    expect(schema.safeParse({ name: "" }).success).toBe(true);
  });

  it("carries field hints as JSON Schema descriptions and marks every key required", () => {
    const json = z.toJSONSchema(jobLlmSchema) as {
      required: string[];
      properties: Record<string, { description?: string; type?: string }>;
    };
    expect(json.properties["company"]?.description).toMatch(/hiring company/i);
    expect(json.properties["skills"]?.type).toBe("array");
    expect(json.properties["skills"]?.description).toMatch(/lowercase/i);
    expect([...json.required].sort()).toEqual([...aiKeys].sort());
  });
});

describe("assessment fields", () => {
  const assessmentKeys = fields.filter((field) => field.source === "assessment").map((field) => field.key);

  it("exist for the CV fit, preference fit and verdict", () => {
    expect(assessmentKeys).toEqual(["cvFit", "preferenceFit", "verdict"]);
  });

  it("are never part of what the extraction model is asked for", () => {
    const json = z.toJSONSchema(jobLlmSchema) as { required: string[] };
    for (const key of assessmentKeys) expect(json.required).not.toContain(key);
  });

  it("are optional to save and accept the four verdict levels", () => {
    for (const verdict of ["low", "medium", "high", "very_high"]) {
      expect(jobFormSchema.safeParse({ ...validJob, verdict }).success).toBe(true);
    }
    expect(jobFormSchema.safeParse({ ...validJob, verdict: "great" }).success).toBe(false);
  });
});

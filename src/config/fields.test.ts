import { describe, expect, it } from "vitest";

import { formFields } from "@/features/job-form/form-values";

import { fields } from "./fields";

describe("field config", () => {
  it("has unique keys and sheet columns", () => {
    const keys = fields.map((field) => field.key);
    const columns = fields.map((field) => field.column.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(columns).size).toBe(columns.length);
  });

  it("gives every enum field options", () => {
    for (const field of fields) {
      if (field.type === "enum") {
        expect("options" in field && field.options.length > 0).toBe(true);
      }
    }
  });

  it("gives every AI field a hint", () => {
    for (const field of fields) {
      if (field.source === "ai") {
        expect("hint" in field && field.hint.length > 0).toBe(true);
      }
    }
  });

  it("makes platform a free-text field with suggestions, not an enum, and the job URL an optional link", () => {
    const platform = fields.find((field) => field.key === "platform");
    expect(platform).toMatchObject({ type: "string", source: "user", nullable: true });
    expect(platform && "suggestions" in platform && platform.suggestions.length).toBeGreaterThan(0);
    expect(platform && "options" in platform).toBe(false);
    expect(fields.find((field) => field.key === "jobUrl")).toMatchObject({
      type: "url",
      source: "user",
      nullable: true,
    });
  });

  it("keeps the job ID code-owned, required and out of the form inputs", () => {
    const jobId = fields.find((field) => field.key === "jobId");
    expect(jobId).toMatchObject({ column: "Job ID", source: "code", required: true });
    expect(formFields.map((field) => field.key as string)).not.toContain("jobId");
  });

  it("never marks a field both required and nullable", () => {
    for (const field of fields) {
      expect("required" in field && "nullable" in field).toBe(false);
    }
  });

  it("never marks a list field nullable (an empty list already means none)", () => {
    for (const field of fields) {
      if (field.type === "stringList") {
        expect("nullable" in field).toBe(false);
      }
    }
  });
});

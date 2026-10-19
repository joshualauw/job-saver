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

  it("keeps the job ID code-owned, required and out of the form inputs", () => {
    const jobId = fields.find((field) => field.key === "jobId");
    expect(jobId).toMatchObject({ column: "Job ID", source: "derived", required: true, hidden: true });
    expect(formFields.some((field) => field.key === "jobId")).toBe(false);
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

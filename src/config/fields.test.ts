import { describe, expect, it } from "vitest";

import { formFields } from "@/features/job-form/form-values";

import { fields, sheetColumns } from "./fields";

describe("field config", () => {
  it("has unique keys and sheet columns", () => {
    const keys = fields.map((field) => field.key);
    const columns = sheetColumns.map((column) => column.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(columns).size).toBe(columns.length);
  });

  it("gives every field a sheet column except the preference fit, which stays in the extension", () => {
    const without = fields.filter((field) => !("column" in field)).map((field) => field.key);
    expect(without).toEqual(["preferenceFit"]);
    expect(sheetColumns).not.toContain("Preference Fit");
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
      if (field.owner === "ai") {
        expect("hint" in field && field.hint.length > 0).toBe(true);
      }
    }
  });

  it("makes source a free-text field with suggestions, not an enum, and the source URL an optional link", () => {
    const sourceField = fields.find((field) => field.key === "source");
    expect(sourceField).toMatchObject({ type: "string", owner: "user", nullable: true });
    expect(sourceField && "suggestions" in sourceField && sourceField.suggestions.length).toBeGreaterThan(0);
    expect(sourceField && "options" in sourceField).toBe(false);
    expect(fields.find((field) => field.key === "sourceUrl")).toMatchObject({
      type: "url",
      owner: "user",
      nullable: true,
    });
  });

  it("keeps the job ID code-owned, required and out of the form inputs", () => {
    const jobId = fields.find((field) => field.key === "jobId");
    expect(jobId).toMatchObject({ column: "Job ID", owner: "code", required: true });
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

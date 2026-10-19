import { describe, expect, it } from "vitest";

import { toFormInputs } from "./form-values";
import type { FormInputs } from "./form-values";
import { jobFormResolver, validateInputs } from "./validate";

const valid: FormInputs = toFormInputs({
  company: "Ryvo",
  jobTitle: "Senior Full-Stack Developer",
  address: "Jakarta",
  contractType: "full_time",
  locationType: "onsite",
  platform: "Jobstreet",
  jobUrl: "https://id.jobstreet.com/id/job/94811596",
  minYoe: null,
  skills: ["node.js"],
  salaryPeriod: "hour",
  salaryCurrency: "IDR",
  minSalary: 70_000,
  maxSalary: null,
  summary: "Builds software.",
  notes: null,
  jobId: "abcdefghijkl",
});

function errorsOf(inputs: FormInputs): Record<string, string> {
  const result = validateInputs(inputs);
  if (result.ok) throw new Error("expected validation to fail");
  return { ...result.errors };
}

describe("validateInputs", () => {
  it("returns typed, normalised values for valid inputs", () => {
    const result = validateInputs({ ...valid, skills: "Node.js, TypeScript, node.js", minSalary: "70000" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.skills).toEqual(["node.js", "typescript"]);
      expect(result.values.minSalary).toBe(70_000);
      expect(result.values.maxSalary).toBeNull();
    }
  });

  it("reports blank required fields as Required", () => {
    expect(errorsOf({ ...valid, company: "  ", jobTitle: "" })).toEqual({
      company: "Required",
      jobTitle: "Required",
    });
  });

  it("explains number problems", () => {
    expect(errorsOf({ ...valid, minSalary: "-5" })["minSalary"]).toBe("Must be 0 or more");
    expect(errorsOf({ ...valid, minSalary: "8 juta" })["minSalary"]).toBe("Must be a number");
  });

  it("explains link problems and lets platform and URL stay empty", () => {
    expect(errorsOf({ ...valid, jobUrl: "example.com" })["jobUrl"]).toBe("Must start with http:// or https://");
    expect(validateInputs({ ...valid, jobUrl: "", platform: "" }).ok).toBe(true);
  });

  it("explains enum problems", () => {
    expect(errorsOf({ ...valid, contractType: "dreaming" })["contractType"]).toBe("Pick one of the options");
  });

  it("gives one message per field", () => {
    const errors = errorsOf({ ...valid, company: "", jobTitle: "", minSalary: "x" });
    expect(Object.keys(errors).sort()).toEqual(["company", "jobTitle", "minSalary"]);
  });
});

describe("jobFormResolver", () => {
  const run = (inputs: FormInputs) =>
    jobFormResolver(inputs, undefined, { fields: {}, shouldUseNativeValidation: false });

  it("passes valid inputs through with no errors", async () => {
    const result = await run(valid);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(valid);
  });

  it("maps validation messages onto field errors", async () => {
    const result = await run({ ...valid, company: "" });
    expect(result.values).toEqual({});
    expect(result.errors["company"]).toMatchObject({ message: "Required" });
  });
});

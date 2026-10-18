import { describe, expect, it } from "vitest";

import { fields } from "@/config/fields";

import { formFields, fromFormInputs, toFormInputs } from "./form-values";

const draft = {
  company: "Ryvo",
  jobTitle: "Senior Full-Stack Developer",
  address: null,
  contractType: "full_time",
  locationType: "onsite",
  platform: "Jobstreet",
  jobUrl: "https://id.jobstreet.com/id/job/94811596",
  minYoe: 2,
  skills: ["node.js", "postgres"],
  salaryPeriod: "hour",
  salaryCurrency: "IDR",
  minSalary: 70_000,
  maxSalary: null,
  summary: "Builds software.",
  notes: null,
  preferenceFit: "Yes: Remote work\nNo: Salary above 10M",
};

describe("toFormInputs", () => {
  it("turns every field into a string, with null as empty and lists comma-joined", () => {
    const inputs = toFormInputs(draft);
    expect(Object.keys(inputs).sort()).toEqual(fields.map((field) => field.key).sort());
    expect(inputs["address"]).toBe("");
    expect(inputs["minSalary"]).toBe("70000");
    expect(inputs["skills"]).toBe("node.js, postgres");
    expect(inputs["contractType"]).toBe("full_time");
  });

  it("treats missing keys as empty", () => {
    expect(toFormInputs({})["company"]).toBe("");
  });
});

describe("assessment fields in the form", () => {
  it("are not shown as inputs", () => {
    const keys = formFields.map((field) => field.key);
    expect(keys).not.toContain("preferenceFit");
    expect(keys).toContain("notes");
  });

  it("still travel through the form state and out to Save", () => {
    const values = fromFormInputs(toFormInputs(draft));
    expect(values["preferenceFit"]).toBe("Yes: Remote work\nNo: Salary above 10M");
  });
});

describe("fromFormInputs", () => {
  it("round-trips a draft back to typed values", () => {
    expect(fromFormInputs(toFormInputs(draft))).toEqual(draft);
  });

  it("turns blank text into null and a blank list into []", () => {
    const values = fromFormInputs({ ...toFormInputs(draft), company: "   ", skills: "" });
    expect(values["company"]).toBeNull();
    expect(values["skills"]).toEqual([]);
  });

  it("parses numbers and keeps unparseable text so validation can reject it", () => {
    const values = fromFormInputs({ ...toFormInputs(draft), minSalary: "8000000", maxSalary: "8 juta" });
    expect(values["minSalary"]).toBe(8_000_000);
    expect(values["maxSalary"]).toBe("8 juta");
  });

  it("normalises a hand-typed skills list", () => {
    const values = fromFormInputs({ ...toFormInputs(draft), skills: "Node.js,  TypeScript , node.js" });
    expect(values["skills"]).toEqual(["node.js", "typescript"]);
  });

  it("treats missing inputs as empty", () => {
    expect(fromFormInputs({})["summary"]).toBeNull();
  });
});

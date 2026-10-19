import { createFormControl } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { formFields, toFormInputs } from "./form-values";
import type { FormInputs } from "./form-values";
import { jobFormResolver, validateInputs } from "./validate";

const draft = {
  company: "Ryvo",
  jobTitle: "Senior Full-Stack Developer",
  source: "Jobstreet",
  sourceUrl: "https://id.jobstreet.com/id/job/94811596",
  skills: ["node.js"],
  preferenceFit: "Yes: Remote work",
  jobId: "abcdefghijkl",
};

// The assessment fields and the job ID are never rendered as inputs, so react-hook-form never
// registers them. They must still reach Save, or saving would blank the sheet's assessment columns
// and the row could not be found again.
describe("assessment values through react-hook-form", () => {
  const inputs = toFormInputs(draft);

  it("are not registered inputs", () => {
    expect(formFields.map((field) => field.key)).not.toContain("preferenceFit");
  });

  it("come out of a submit with their initial values", async () => {
    const { handleSubmit } = createFormControl<FormInputs>({ defaultValues: inputs, resolver: jobFormResolver });

    let submitted: FormInputs | undefined;
    await handleSubmit((data) => {
      submitted = data;
    })();

    expect(submitted?.["preferenceFit"]).toBe("Yes: Remote work");

    const result = submitted ? validateInputs(submitted) : null;
    expect(result?.ok && result.values.preferenceFit).toBe("Yes: Remote work");
  });

  it("carry the job ID out of a submit, and a retargeted ID replaces it", async () => {
    const control = createFormControl<FormInputs>({ defaultValues: inputs, resolver: jobFormResolver });
    expect(formFields.map((field) => field.key)).not.toContain("jobId");

    control.setValue("jobId", "zzzzzzzzzzzz");

    let submitted: FormInputs | undefined;
    await control.handleSubmit((data) => {
      submitted = data;
    })();
    expect(submitted?.["jobId"]).toBe("zzzzzzzzzzzz");
  });

  it("are part of the values the change subscription reports", () => {
    const { subscribe, getValues } = createFormControl<FormInputs>({ defaultValues: inputs });
    expect(typeof subscribe).toBe("function");
    expect(getValues()["preferenceFit"]).toBe("Yes: Remote work");
  });
});

import { createFormControl } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { formFields, toFormInputs } from "./form-values";
import type { FormInputs } from "./form-values";
import { jobFormResolver, validateInputs } from "./validate";

const draft = {
  company: "Ryvo",
  jobTitle: "Senior Full-Stack Developer",
  platform: "Jobstreet",
  jobUrl: "https://id.jobstreet.com/id/job/94811596",
  status: "saved",
  skills: ["node.js"],
  cvFit: "Good match.",
  preferenceFit: "Yes: Remote work",
  verdict: "high",
};

// The assessment fields are never rendered as inputs, so react-hook-form never registers them. They
// must still reach Save, or saving would blank the sheet's assessment columns.
describe("assessment values through react-hook-form", () => {
  const inputs = toFormInputs(draft);

  it("are not registered inputs", () => {
    expect(formFields.map((field) => field.key)).not.toContain("verdict");
  });

  it("come out of a submit with their initial values", async () => {
    const { handleSubmit } = createFormControl<FormInputs>({ defaultValues: inputs, resolver: jobFormResolver });

    let submitted: FormInputs | undefined;
    await handleSubmit((data) => {
      submitted = data;
    })();

    expect(submitted?.["verdict"]).toBe("high");
    expect(submitted?.["cvFit"]).toBe("Good match.");
    expect(submitted?.["preferenceFit"]).toBe("Yes: Remote work");

    const result = submitted ? validateInputs(submitted) : null;
    expect(result?.ok && result.values.verdict).toBe("high");
  });

  it("are part of the values the change subscription reports", () => {
    const { subscribe, getValues } = createFormControl<FormInputs>({ defaultValues: inputs });
    expect(typeof subscribe).toBe("function");
    expect(getValues()["verdict"]).toBe("high");
  });
});

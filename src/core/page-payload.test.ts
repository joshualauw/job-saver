import { describe, expect, it } from "vitest";

import { AppError, PageAccessError } from "./errors";
import { pagePayloadSchema } from "./page-payload";

const valid = {
  url: "https://id.jobstreet.com/id/job/1",
  title: "Dev - Jobstreet",
  facts: { Salary: "Rp 1" },
  description: "text",
  jsonLd: [],
  contentSource: "platform",
};

describe("pagePayloadSchema", () => {
  it("accepts a well-formed payload", () => {
    expect(pagePayloadSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["missing url", { ...valid, url: "" }],
    ["non-string fact", { ...valid, facts: { Salary: 1 } }],
    ["unknown content source", { ...valid, contentSource: "magic" }],
    ["non-array jsonLd", { ...valid, jsonLd: {} }],
  ])("rejects %s", (_label, input) => {
    expect(pagePayloadSchema.safeParse(input).success).toBe(false);
  });

  it("rejects non-object results such as a missing injection result", () => {
    expect(pagePayloadSchema.safeParse(undefined).success).toBe(false);
    expect(pagePayloadSchema.safeParse(null).success).toBe(false);
  });
});

describe("PageAccessError", () => {
  it("is an AppError with the page_access code and a user-safe message", () => {
    const error = new PageAccessError("Can't read this tab.");
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("page_access");
    expect(error.name).toBe("PageAccessError");
    expect(error.message).toBe("Can't read this tab.");
  });
});

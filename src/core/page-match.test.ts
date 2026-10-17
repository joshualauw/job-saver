import { describe, expect, it } from "vitest";

import { platforms } from "@/config/platforms";

import { isSameJobPage } from "./page-match";

const same = (a: string | null, b: string | null) => isSameJobPage(a, b, platforms);

describe("isSameJobPage", () => {
  it("matches the same posting despite tracking params and fragments", () => {
    expect(same("https://id.jobstreet.com/id/job/123?ref=search#apply", "https://id.jobstreet.com/id/job/123")).toBe(
      true,
    );
  });

  it("tells two postings apart", () => {
    expect(same("https://id.jobstreet.com/id/job/123", "https://id.jobstreet.com/id/job/456")).toBe(false);
  });

  it("does not match a search page to the posting it shows", () => {
    expect(same("https://id.jobstreet.com/jobs?jobId=123&q=dev", "https://id.jobstreet.com/id/job/123")).toBe(false);
  });

  it("never matches a tab the extension cannot see", () => {
    expect(same("https://id.jobstreet.com/id/job/123", null)).toBe(false);
    expect(same(null, null)).toBe(false);
  });

  it("never matches a non-web URL", () => {
    expect(same("https://id.jobstreet.com/id/job/123", "chrome://extensions")).toBe(false);
  });
});

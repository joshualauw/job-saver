import { describe, expect, it } from "vitest";

import { platforms } from "@/config/platforms";

import { resolveJobSource } from "./job-source";

// Synthetic edge cases. The real `/id/job/<id>` shape is verified against saved pages in
// tests/jobstreet-extraction.test.ts; the `?jobId=` search-page case is still unverified.
describe("resolveJobSource with the Jobstreet platform", () => {
  const resolve = (url: string) => resolveJobSource(url, platforms);

  it("canonicalises a job detail URL", () => {
    expect(resolve("https://id.jobstreet.com/id/job/87654321?type=standard&ref=search#apply")).toEqual({
      platform: "Jobstreet",
      jobUrl: "https://id.jobstreet.com/id/job/87654321",
    });
  });

  it("drops trailing path segments after the job id", () => {
    expect(resolve("https://www.jobstreet.com.sg/job/123/apply?x=1")?.jobUrl).toBe(
      "https://www.jobstreet.com.sg/job/123",
    );
  });

  it("derives the job URL from ?jobId= on search pages", () => {
    expect(resolve("https://id.jobstreet.com/jobs?jobId=555&q=engineer")?.jobUrl).toBe(
      "https://id.jobstreet.com/job/555",
    );
  });

  it("falls back to generic cleaning for other Jobstreet paths", () => {
    expect(resolve("https://id.jobstreet.com/companies/acme?utm_source=x")?.jobUrl).toBe(
      "https://id.jobstreet.com/companies/acme",
    );
  });

  it("does not treat a lookalike host as Jobstreet", () => {
    expect(resolve("https://notjobstreet.com/job/1")?.platform).toBe("notjobstreet.com");
  });
});

describe("resolveJobSource for unknown platforms", () => {
  it("uses the hostname (without www) and generic cleaning", () => {
    expect(resolveJobSource("https://www.example.com/careers/42/?utm_campaign=a#x", platforms)).toEqual({
      platform: "example.com",
      jobUrl: "https://www.example.com/careers/42",
    });
  });

  it("returns null for non-http URLs", () => {
    expect(resolveJobSource("chrome://newtab", platforms)).toBeNull();
    expect(resolveJobSource("", platforms)).toBeNull();
  });
});

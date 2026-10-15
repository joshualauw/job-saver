import { describe, expect, it } from "vitest";

import { appConfig } from "@/config/app";
import { platforms } from "@/config/platforms";
import { resolveJobSource } from "@/core/job-source";
import { pagePayloadSchema } from "@/core/page-payload";
import { buildPagePayload } from "@/features/page-extract/extract-page";

import { loadFixture } from "./helpers/fixtures";

// Snapshots of real, rendered Jobstreet postings (personal data scrubbed). They guard the
// `data-automation` selectors in config/platforms.ts against drift in our own config; if
// Jobstreet changes its markup, refresh the fixtures and update the selectors.
const CASES = [
  {
    name: "1",
    jobUrl: "https://id.jobstreet.com/id/job/95287163",
    facts: {
      "Job title": "Junior AI Developer (Full Remote)",
      Company: "Global Business Group Indonesia",
      Location: "Bali (Jarak jauh)",
      "Work type": "Full time",
      Salary: "Rp 7.000.000 – Rp 9.000.000 per month",
      Classification: "Teknik – Perangkat Lunak (Teknologi Informasi & Komunikasi)",
    },
    descriptionStart: "Are you excited about how AI is changing the way software is built?",
  },
  {
    name: "2",
    jobUrl: "https://id.jobstreet.com/id/job/95080817",
    facts: {
      "Job title": "Mobile Developer Flutter — Project Based",
      Company: "PT Edubuild Pratama Indonesia",
      Location: "Jakarta Pusat, Jakarta Raya (Jarak jauh)",
      "Work type": "Kontrak/Temporer",
      Salary: "Rp 6.700.000 – Rp 10.000.000 per month",
      Classification: "Developer/Programmer (Teknologi Informasi & Komunikasi)",
    },
    descriptionStart: "Location: Jakarta",
  },
  {
    name: "3",
    jobUrl: "https://id.jobstreet.com/id/job/94811596",
    facts: {
      "Job title": "Senior Full-Stack Developer",
      Company: "Ryvo",
      Location: "Jakarta Raya (Jarak jauh)",
      "Work type": "Full time",
      Salary: "Rp 70,000 per hour",
      Classification: "Developer/Programmer (Teknologi Informasi & Komunikasi)",
    },
    descriptionStart: "About the Role",
  },
] as const;

describe.each(CASES)("Jobstreet fixture $name", ({ name, jobUrl, facts, descriptionStart }) => {
  const { document, url } = loadFixture("jobstreet", name);
  const payload = buildPagePayload(document, {
    platforms,
    maxChars: appConfig.maxPageTextChars,
    selection: null,
  });

  it("produces a payload that passes the boundary schema", () => {
    expect(pagePayloadSchema.safeParse(payload).success).toBe(true);
    expect(payload.url).toBe(url);
    expect(payload.title).toContain("Jobstreet");
  });

  it("reads every labelled fact from the data-automation hooks", () => {
    expect(payload.facts).toEqual(facts);
  });

  it("reads only the ad body as the description", () => {
    expect(payload.contentSource).toBe("platform");
    expect(payload.description.startsWith(descriptionStart)).toBe(true);
    expect(payload.description.length).toBeGreaterThan(500);
    expect(payload.description.length).toBeLessThanOrEqual(appConfig.maxPageTextChars);
    // Header facts live outside the ad body and must not leak into it.
    expect(payload.description).not.toContain(facts.Salary);
    expect(payload.description).not.toContain(facts.Classification);
  });

  it("finds no JobPosting JSON-LD (Jobstreet only ships a WebSite stub)", () => {
    expect(payload.jsonLd).toEqual([]);
  });

  it("derives the platform and a clean job URL from the page URL", () => {
    expect(resolveJobSource(url, platforms)).toEqual({ platform: "Jobstreet", jobUrl });
  });
});

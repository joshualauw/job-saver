import { describe, expect, it } from "vitest";

import type { LlmJobValues } from "@/config/fields";
import { platforms } from "@/config/platforms";
import { resolveJobSource } from "@/core/job-source";

import { loadFixture } from "../../../tests/helpers/fixtures";

import { buildJobDraft } from "./draft";

// Hand-written model answers for the saved Jobstreet pages (no network in tests).
const ANSWERS: Record<string, LlmJobValues> = {
  "1": {
    company: "Global Business Group Indonesia",
    jobTitle: "Junior AI Developer (Full Remote)",
    address: "Bali",
    contractType: "full_time",
    locationType: "remote",
    minYoe: null,
    skills: ["AI Coding Agents", "Claude Code", "claude code"],
    salaryPeriod: "month",
    salaryCurrency: "IDR",
    minSalary: 7_000_000,
    maxSalary: 9_000_000,
    summary: "Junior developer working with AI coding agents on a multi-tenant platform.",
    notes: null,
  },
  "2": {
    company: "PT Edubuild Pratama Indonesia",
    jobTitle: "Mobile Developer Flutter — Project Based",
    address: "Jakarta Pusat, Jakarta Raya",
    contractType: "contract",
    locationType: "remote",
    minYoe: 2,
    skills: ["Next.js", "Flutter"],
    salaryPeriod: "month",
    salaryCurrency: "IDR",
    minSalary: 6_700_000,
    maxSalary: 10_000_000,
    summary: "Project-based frontend and mobile developer.",
    notes: "Project duration 3-6 months; remote",
  },
  "3": {
    company: "Ryvo",
    jobTitle: "Senior Full-Stack Developer",
    address: "Jakarta Raya",
    contractType: "full_time",
    locationType: "remote",
    minYoe: null,
    skills: [],
    salaryPeriod: "hour",
    salaryCurrency: "IDR",
    minSalary: 70_000,
    maxSalary: null,
    summary: "Builds custom software from concept to launch.",
    notes: null,
  },
};

const JOB_URLS: Record<string, string> = {
  "1": "https://id.jobstreet.com/id/job/95287163",
  "2": "https://id.jobstreet.com/id/job/95080817",
  "3": "https://id.jobstreet.com/id/job/94811596",
};

function answerFor(name: string): LlmJobValues {
  const answer = ANSWERS[name];
  if (!answer) throw new Error(`no canned answer for fixture ${name}`);
  return answer;
}

function sourceFor(name: string) {
  return resolveJobSource(loadFixture("jobstreet", name).url, platforms);
}

describe.each(["1", "2", "3"])("buildJobDraft for Jobstreet fixture %s", (name) => {
  const { values, missing } = buildJobDraft({
    source: sourceFor(name),
    llm: answerFor(name),
    status: "saved",
  });

  it("fills code-owned fields from the URL and defaults", () => {
    expect(values.platform).toBe("Jobstreet");
    expect(values.jobUrl).toBe(JOB_URLS[name]);
    expect(values.status).toBe("saved");
    expect(values.appliedAt).toBeNull();
    expect(values.lastUpdatedAt).toBeNull();
  });

  it("keeps the model's values and normalises skills", () => {
    const answer = answerFor(name);
    expect(values.company).toBe(answer.company);
    expect(values.minSalary).toBe(answer.minSalary);
    expect(values.maxSalary).toBe(answer.maxSalary);
    expect(values.notes).toBe(answer.notes);
    expect(values.skills).toEqual([...new Set(answer.skills.map((skill) => skill.toLowerCase()))]);
  });

  it("reports only genuinely missing fields", () => {
    // Every answer here has company/title; minYoe, maxSalary and notes may legitimately be absent.
    const optional = new Set(["minYoe", "maxSalary", "notes"]);
    expect(missing.filter((key) => !optional.has(key))).toEqual([]);
  });
});

describe("buildJobDraft details", () => {
  const source = { platform: "Jobstreet", jobUrl: "https://id.jobstreet.com/id/job/1" };

  it("leaves the assessment empty for a new job and never flags it as missing", () => {
    const { values, missing } = buildJobDraft({ source, llm: answerFor("1"), status: "saved" });
    expect(values.cvFit).toBeNull();
    expect(values.preferenceFit).toBeNull();
    expect(values.verdict).toBeNull();
    expect(missing).not.toContain("verdict");
  });

  it("normalises skills", () => {
    const { values } = buildJobDraft({
      source,
      llm: { ...answerFor("1"), skills: ["Node.js", " TypeScript ", "node.js"] },
      status: "saved",
    });
    expect(values.skills).toEqual(["node.js", "typescript"]);
  });

  it("turns blank strings into null and lists them as missing", () => {
    const { values, missing } = buildJobDraft({
      source,
      llm: { ...answerFor("3"), company: "  ", address: null },
      status: "saved",
    });
    expect(values.company).toBeNull();
    expect(missing).toContain("company");
    expect(missing).toContain("address");
  });

  it("does not count an empty skills list or user-owned dates as missing", () => {
    const { missing } = buildJobDraft({ source, llm: { ...answerFor("3"), skills: [] }, status: "saved" });
    expect(missing).not.toContain("skills");
    expect(missing).not.toContain("appliedAt");
    expect(missing).not.toContain("lastUpdatedAt");
  });

  it("never lets the model set code-owned fields", () => {
    const hostile = {
      ...answerFor("1"),
      platform: "Evil",
      jobUrl: "https://evil.example",
      status: "offer",
      appliedAt: "2020-01-01",
    } as unknown as LlmJobValues;
    const { values } = buildJobDraft({ source, llm: hostile, status: "saved" });
    expect(values.platform).toBe("Jobstreet");
    expect(values.jobUrl).toBe(source.jobUrl);
    expect(values.status).toBe("saved");
    expect(values.appliedAt).toBeNull();
  });

  describe("refreshing a saved row", () => {
    const saved = {
      company: "Old Co",
      jobTitle: "Old title",
      address: "Bali",
      skills: ["php"],
      summary: "Old summary.",
      platform: "Jobstreet",
      jobUrl: source.jobUrl,
      status: "interviewing",
      appliedAt: 46000,
      lastUpdatedAt: 46010,
    };

    it("keeps the user's fields and dates, and takes new values for AI fields", () => {
      const { values } = buildJobDraft({ source, llm: answerFor("1"), status: "saved", saved });
      expect(values.status).toBe("interviewing");
      expect(values.appliedAt).toBe(46000);
      expect(values.lastUpdatedAt).toBe(46010);
      expect(values.company).toBe(answerFor("1").company);
      expect(values.summary).toBe(answerFor("1").summary);
    });

    it("keeps a saved value when the model found nothing for it", () => {
      const llm = { ...answerFor("3"), address: null, skills: [], summary: "  " };
      const { values, missing } = buildJobDraft({ source, llm, status: "saved", saved });
      expect(values.skills).toEqual(["php"]);
      expect(values.summary).toBe("Old summary.");
      expect(missing).not.toContain("summary");
    });

    it("keeps a saved assessment, which extraction never produces", () => {
      const { values } = buildJobDraft({
        source,
        llm: answerFor("1"),
        status: "saved",
        saved: { ...saved, cvFit: "Good match.", verdict: "high" },
      });
      expect(values.cvFit).toBe("Good match.");
      expect(values.verdict).toBe("high");
    });

    it("still flags AI fields that are blank in both", () => {
      const { values, missing } = buildJobDraft({
        source,
        llm: { ...answerFor("3"), notes: null },
        status: "saved",
        saved,
      });
      expect(values.notes).toBeNull();
      expect(missing).toContain("notes");
    });

    it("ignores code- or user-owned values from the model and takes platform and URL from the source", () => {
      const hostile = { ...answerFor("1"), status: "offer", jobUrl: "https://evil.example" } as unknown as LlmJobValues;
      const { values } = buildJobDraft({ source, llm: hostile, status: "saved", saved });
      expect(values.status).toBe("interviewing");
      expect(values.jobUrl).toBe(source.jobUrl);
    });

    it("falls back to the default status when the saved row has none", () => {
      const { values } = buildJobDraft({
        source,
        llm: answerFor("1"),
        status: "saved",
        saved: { jobUrl: source.jobUrl },
      });
      expect(values.status).toBe("saved");
      expect(values.skills).toEqual(["ai coding agents", "claude code"]);
    });
  });

  it("leaves platform and jobUrl empty (and flagged) when the URL is unusable", () => {
    const { values, missing } = buildJobDraft({ source: null, llm: answerFor("1"), status: "saved" });
    expect(values.platform).toBeNull();
    expect(values.jobUrl).toBeNull();
    expect(missing).toEqual(expect.arrayContaining(["platform", "jobUrl"]));
  });
});

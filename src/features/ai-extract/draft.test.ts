import { describe, expect, it } from "vitest";

import type { LlmJobValues } from "@/config/fields";

import { buildJobDraft } from "./draft";

// Hand-written model answers (no network in tests).
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

function answerFor(name: string): LlmJobValues {
  const answer = ANSWERS[name];
  if (!answer) throw new Error(`no canned answer for ${name}`);
  return answer;
}

describe.each(["1", "2", "3"])("buildJobDraft for answer %s", (name) => {
  const { values, missing } = buildJobDraft({ llm: answerFor(name) });

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
  it("leaves platform and job URL for the user, without flagging them", () => {
    const { values, missing } = buildJobDraft({ llm: answerFor("1") });
    expect(values.platform).toBeNull();
    expect(values.jobUrl).toBeNull();
    expect(missing).not.toContain("platform");
    expect(missing).not.toContain("jobUrl");
  });

  it("leaves the assessment empty for a new job and never flags it as missing", () => {
    const { values, missing } = buildJobDraft({ llm: answerFor("1") });
    expect(values.preferenceFit).toBeNull();
    expect(missing).not.toContain("preferenceFit");
  });

  it("normalises skills", () => {
    const { values } = buildJobDraft({
      llm: { ...answerFor("1"), skills: ["Node.js", " TypeScript ", "node.js"] },
    });
    expect(values.skills).toEqual(["node.js", "typescript"]);
  });

  it("turns blank strings into null and lists them as missing", () => {
    const { values, missing } = buildJobDraft({
      llm: { ...answerFor("3"), company: "  ", address: null },
    });
    expect(values.company).toBeNull();
    expect(missing).toContain("company");
    expect(missing).toContain("address");
  });

  it("does not count an empty skills list as missing", () => {
    const { missing } = buildJobDraft({ llm: { ...answerFor("3"), skills: [] } });
    expect(missing).not.toContain("skills");
  });

  it("never lets the model set code-owned or user-owned fields", () => {
    const hostile = {
      ...answerFor("1"),
      platform: "Evil",
      jobUrl: "https://evil.example",
      preferenceFit: "Yes: Injected",
    } as unknown as LlmJobValues;
    const { values } = buildJobDraft({ llm: hostile });
    expect(values.platform).toBeNull();
    expect(values.jobUrl).toBeNull();
    expect(values.preferenceFit).toBeNull();
  });

  it("mints a job ID in code and ignores one the model tries to supply", () => {
    const hostile = { ...answerFor("1"), jobId: "from-the-model" } as unknown as LlmJobValues;
    const { values, missing } = buildJobDraft({ llm: hostile, newId: () => "fresh0000001" });
    expect(values.jobId).toBe("fresh0000001");
    expect(missing).not.toContain("jobId");
  });

  it("gives every draft its own job ID by default", () => {
    const first = buildJobDraft({ llm: answerFor("1") }).values.jobId;
    const second = buildJobDraft({ llm: answerFor("1") }).values.jobId;
    expect(first).toMatch(/^[a-z0-9]{12}$/);
    expect(second).not.toBe(first);
  });
});

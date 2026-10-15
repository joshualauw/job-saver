import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import type { LlmJobValues } from "@/config/fields";
import { AuthError, PageAccessError } from "@/core/errors";
import type { PagePayload } from "@/core/page-payload";

import { analyzeJob } from "./analyze-job";
import type { AnalyzeDeps } from "./analyze-job";

const payload: PagePayload = {
  url: "https://id.jobstreet.com/id/job/95287163?ref=recom-homepage#sol=abc",
  title: "Dev - Jobstreet",
  facts: { Salary: "Rp 70,000 per hour" },
  description: "Build things.",
  jsonLd: [],
  contentSource: "platform",
};

const answer: LlmJobValues = {
  company: "Ryvo",
  jobTitle: "Senior Full-Stack Developer",
  address: null,
  contractType: "full_time",
  locationType: "remote",
  minYoe: null,
  skills: ["Node.js"],
  salaryPeriod: "hour",
  salaryCurrency: "IDR",
  minSalary: 70_000,
  maxSalary: null,
  summary: "Builds software.",
  notes: "BPJS",
};

function deps(overrides: Partial<AnalyzeDeps> = {}) {
  const extract = vi.fn().mockResolvedValue(answer);
  const createExtractor = vi.fn().mockReturnValue({ extract });
  const extractPage = vi.fn().mockResolvedValue(payload);
  const all: AnalyzeDeps = {
    readSettings: () => Promise.resolve({ openaiApiKey: "sk-test" }),
    extractPage,
    createExtractor,
    ...overrides,
  };
  return { all, extract, createExtractor, extractPage };
}

describe("analyzeJob", () => {
  it("fails with AuthError before touching the page when no key is saved", async () => {
    const { all, extractPage } = deps({ readSettings: () => Promise.resolve({}) });
    await expect(analyzeJob(all)).rejects.toBeInstanceOf(AuthError);
    expect(extractPage).not.toHaveBeenCalled();
  });

  it("reads the page, asks the model, and merges code-owned fields", async () => {
    const { all, extract, createExtractor } = deps();
    const result = await analyzeJob(all);

    expect(extract).toHaveBeenCalledWith(payload);
    expect(createExtractor).toHaveBeenCalledWith({ apiKey: "sk-test", model: appConfig.openaiModel });
    expect(result.payload).toBe(payload);
    expect(result.values.platform).toBe("Jobstreet");
    expect(result.values.jobUrl).toBe("https://id.jobstreet.com/id/job/95287163");
    expect(result.values.status).toBe(appConfig.defaultStatus);
    expect(result.values.skills).toEqual(["node.js"]);
    expect(result.missing).toContain("address");
  });

  it("prefers the model saved in settings over the config default", async () => {
    const { all, createExtractor } = deps({
      readSettings: () => Promise.resolve({ openaiApiKey: "sk-test", openaiModel: "my-model" }),
    });
    await analyzeJob(all);
    expect(createExtractor).toHaveBeenCalledWith({ apiKey: "sk-test", model: "my-model" });
  });

  it("does not call the model when the page cannot be read", async () => {
    const { all, createExtractor } = deps({
      extractPage: () => Promise.reject(new PageAccessError("no access")),
    });
    await expect(analyzeJob(all)).rejects.toBeInstanceOf(PageAccessError);
    expect(createExtractor).not.toHaveBeenCalled();
  });
});

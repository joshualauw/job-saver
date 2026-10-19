import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import type { AssessmentValues, LlmJobValues } from "@/config/fields";
import { AuthError, NetworkError, PageAccessError, RateLimitError } from "@/core/errors";
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

const CLEAN_URL = "https://id.jobstreet.com/id/job/95287163";

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

const assessment: AssessmentValues = {
  preferenceFit: "Yes: Remote work",
};

function deps(overrides: Partial<AnalyzeDeps> = {}) {
  const assess = vi.fn().mockResolvedValue(assessment);
  const createAssessor = vi.fn().mockReturnValue({ assess });
  const extract = vi.fn().mockResolvedValue(answer);
  const createExtractor = vi.fn().mockReturnValue({ extract });
  const extractPage = vi.fn().mockResolvedValue(payload);
  const all: AnalyzeDeps = {
    readSettings: () => Promise.resolve({ openaiApiKey: "sk-test" }),
    extractPage,
    createExtractor,
    createAssessor,
    ...overrides,
  };
  return { all, extract, createExtractor, createAssessor, assess, extractPage };
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
    expect(result.values.jobUrl).toBe(CLEAN_URL);
    expect(result.values.skills).toEqual(["node.js"]);
    expect(result.missing).toContain("address");
  });

  it("gives every analysis a new job ID, even for the same page", async () => {
    const { all } = deps();
    const first = await analyzeJob(all);
    const second = await analyzeJob(all);

    expect(first.values.jobId).toMatch(/^[a-z0-9]{12}$/);
    expect(second.values.jobId).not.toBe(first.values.jobId);
  });

  it("runs without a spreadsheet and never asks the model again for a page it has seen", async () => {
    const { all, extract } = deps({
      readSettings: () => Promise.resolve({ openaiApiKey: "sk-test", spreadsheetId: "sheet-id" }),
    });
    await analyzeJob(all);
    await analyzeJob(all);
    expect(extract).toHaveBeenCalledTimes(2);
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

const withPreferences = () => Promise.resolve({ openaiApiKey: "sk-test", preferences: ["Remote work"] });

describe("analyzeJob with the assessor", () => {
  it("does not assess when no preferences are set", async () => {
    const { all, createAssessor } = deps();
    const result = await analyzeJob(all);

    expect(createAssessor).not.toHaveBeenCalled();
    expect(result.values.preferenceFit).toBeNull();
    expect(result.assessmentError).toBeNull();
  });

  it("assesses with preferences and merges the result into the values", async () => {
    const { all, assess, createAssessor } = deps({ readSettings: withPreferences });
    const result = await analyzeJob(all);

    expect(createAssessor).toHaveBeenCalledWith({ apiKey: "sk-test", model: appConfig.openaiModel });
    expect(assess).toHaveBeenCalledOnce();
    expect(result.values).toMatchObject({ company: "Ryvo", ...assessment });
    expect(result.assessmentError).toBeNull();
  });

  it("passes the page and the preferences, and uses the model from settings", async () => {
    const { all, assess, createAssessor } = deps({
      readSettings: () =>
        Promise.resolve({ openaiApiKey: "sk-test", openaiModel: "my-model", preferences: ["Remote work"] }),
    });
    await analyzeJob(all);

    expect(createAssessor).toHaveBeenCalledWith({ apiKey: "sk-test", model: "my-model" });
    expect(assess).toHaveBeenCalledWith({ payload, preferences: ["Remote work"] });
  });

  it("starts the assessor before extraction has finished", async () => {
    let finishExtraction: (value: LlmJobValues) => void = () => undefined;
    const extract = vi.fn().mockReturnValue(new Promise<LlmJobValues>((resolve) => (finishExtraction = resolve)));
    const { all, assess } = deps({ readSettings: withPreferences, createExtractor: () => ({ extract }) });

    const running = analyzeJob(all);
    await vi.waitFor(() => expect(assess).toHaveBeenCalledOnce());
    expect(extract).toHaveBeenCalledOnce();

    finishExtraction(answer);
    await expect(running).resolves.toMatchObject({ values: { preferenceFit: "Yes: Remote work" } });
  });

  it("keeps the extracted form and reports why when the assessment fails", async () => {
    const { all, assess } = deps({ readSettings: withPreferences });
    assess.mockRejectedValue(new RateLimitError("OpenAI rate limit or quota reached."));

    const result = await analyzeJob(all);

    expect(result.values.company).toBe("Ryvo");
    expect(result.values.preferenceFit).toBeNull();
    expect(result.assessmentError).toBe("OpenAI rate limit or quota reached.");
  });

  it("uses a generic message for an unexpected assessor failure, never its text", async () => {
    const { all, assess } = deps({ readSettings: withPreferences });
    assess.mockRejectedValue(new Error("secret-preference-marker"));

    const result = await analyzeJob(all);

    expect(result.assessmentError).toBe("Something went wrong while judging this job.");
    expect(result.assessmentError).not.toContain("secret-preference-marker");
  });

  it("still fails when extraction fails, without an unhandled rejection from the assessor", async () => {
    const extract = vi.fn().mockRejectedValue(new NetworkError("offline"));
    const { all, assess } = deps({ readSettings: withPreferences, createExtractor: () => ({ extract }) });
    assess.mockRejectedValue(new RateLimitError("limited"));

    await expect(analyzeJob(all)).rejects.toBeInstanceOf(NetworkError);
    await vi.waitFor(() => expect(assess).toHaveBeenCalledOnce());
  });
});

import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import type { AssessmentValues, LlmJobValues } from "@/config/fields";
import { AuthError, NetworkError, PageAccessError, RateLimitError } from "@/core/errors";
import type { PagePayload } from "@/core/page-payload";
import type { SavedJob } from "@/core/types";

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

const saved: SavedJob = {
  row: 7,
  values: { company: "Ryvo", jobUrl: CLEAN_URL, summary: "Old summary.", skills: ["node.js"] },
};

const assessment: AssessmentValues = {
  cvFit: "Matches the Node.js requirement.",
  preferenceFit: "Yes: Remote work",
  verdict: "high",
};

function deps(overrides: Partial<AnalyzeDeps> = {}) {
  const assess = vi.fn().mockResolvedValue(assessment);
  const createAssessor = vi.fn().mockReturnValue({ assess });
  const extract = vi.fn().mockResolvedValue(answer);
  const createExtractor = vi.fn().mockReturnValue({ extract });
  const extractPage = vi.fn().mockResolvedValue(payload);
  const find = vi.fn().mockResolvedValue(null);
  const createSink = vi.fn().mockReturnValue({ find, save: vi.fn() });
  const all: AnalyzeDeps = {
    readSettings: () => Promise.resolve({ openaiApiKey: "sk-test" }),
    extractPage,
    createExtractor,
    createAssessor,
    createSink,
    ...overrides,
  };
  return { all, extract, createExtractor, createAssessor, assess, extractPage, find, createSink };
}

const withSheet = () => Promise.resolve({ openaiApiKey: "sk-test", spreadsheetId: "sheet-id" });

describe("analyzeJob", () => {
  it("fails with AuthError before touching the page when no key is saved", async () => {
    const { all, extractPage } = deps({ readSettings: () => Promise.resolve({}) });
    await expect(analyzeJob({}, all)).rejects.toBeInstanceOf(AuthError);
    expect(extractPage).not.toHaveBeenCalled();
  });

  it("reads the page, asks the model, and merges code-owned fields", async () => {
    const { all, extract, createExtractor } = deps();
    const result = await analyzeJob({}, all);

    expect(extract).toHaveBeenCalledWith(payload);
    expect(createExtractor).toHaveBeenCalledWith({ apiKey: "sk-test", model: appConfig.openaiModel });
    expect(result.payload).toBe(payload);
    expect(result.existing).toBe(false);
    expect(result.values.platform).toBe("Jobstreet");
    expect(result.values.jobUrl).toBe(CLEAN_URL);
    expect(result.values.skills).toEqual(["node.js"]);
    expect(result.missing).toContain("address");
  });

  it("prefers the model saved in settings over the config default", async () => {
    const { all, createExtractor } = deps({
      readSettings: () => Promise.resolve({ openaiApiKey: "sk-test", openaiModel: "my-model" }),
    });
    await analyzeJob({}, all);
    expect(createExtractor).toHaveBeenCalledWith({ apiKey: "sk-test", model: "my-model" });
  });

  it("does not call the model when the page cannot be read", async () => {
    const { all, createExtractor } = deps({
      extractPage: () => Promise.reject(new PageAccessError("no access")),
    });
    await expect(analyzeJob({}, all)).rejects.toBeInstanceOf(PageAccessError);
    expect(createExtractor).not.toHaveBeenCalled();
  });
});

describe("analyzeJob with a spreadsheet", () => {
  it("skips the sheet lookup when no spreadsheet is configured", async () => {
    const { all, createSink } = deps();
    await analyzeJob({}, all);
    expect(createSink).not.toHaveBeenCalled();
  });

  it("looks up the clean job URL and still asks the model when it is not saved yet", async () => {
    const { all, find, createSink, extract } = deps({ readSettings: withSheet });
    const result = await analyzeJob({}, all);

    expect(createSink).toHaveBeenCalledWith("sheet-id", appConfig.defaultSheetTab);
    expect(find).toHaveBeenCalledWith(CLEAN_URL);
    expect(extract).toHaveBeenCalledOnce();
    expect(result.existing).toBe(false);
  });

  it("uses the tab name saved in settings", async () => {
    const { all, createSink } = deps({
      readSettings: () =>
        Promise.resolve({ openaiApiKey: "sk-test", spreadsheetId: "sheet-id", sheetTab: "Applications" }),
    });
    await analyzeJob({}, all);
    expect(createSink).toHaveBeenCalledWith("sheet-id", "Applications");
  });

  it("loads the saved row and skips OpenAI when the job is already in the sheet", async () => {
    const { all, find, createExtractor } = deps({ readSettings: withSheet });
    find.mockResolvedValue(saved);

    const result = await analyzeJob({}, all);

    expect(createExtractor).not.toHaveBeenCalled();
    expect(result.existing).toBe(true);
    expect(result.values).toBe(saved.values);
    expect(result.missing).toEqual([]);
  });

  it("with refresh, asks the model and stays an update", async () => {
    const { all, find, extract } = deps({ readSettings: withSheet });
    find.mockResolvedValue(saved);

    const result = await analyzeJob({ refresh: true }, all);

    expect(extract).toHaveBeenCalledOnce();
    expect(result.existing).toBe(true);
    expect(result.values.summary).toBe("Builds software.");
    expect(result.values.jobUrl).toBe(CLEAN_URL);
  });

  it("with refresh, behaves like a fresh analysis when the job is not saved", async () => {
    const { all, extract } = deps({ readSettings: withSheet });

    const result = await analyzeJob({ refresh: true }, all);

    expect(extract).toHaveBeenCalledOnce();
    expect(result.existing).toBe(false);
  });

  it("surfaces a lookup failure instead of silently calling the model", async () => {
    const { all, find, createExtractor } = deps({ readSettings: withSheet });
    find.mockRejectedValue(new NetworkError("offline"));

    await expect(analyzeJob({}, all)).rejects.toBeInstanceOf(NetworkError);
    expect(createExtractor).not.toHaveBeenCalled();
  });
});

const CV = "Jane Doe, secret-cv-marker. Five years of Node.js.";
const withCv = () => Promise.resolve({ openaiApiKey: "sk-test", cvText: CV });
const withPreferences = () => Promise.resolve({ openaiApiKey: "sk-test", preferences: ["Remote work"] });
const withCvAndSheet = () =>
  Promise.resolve({ openaiApiKey: "sk-test", spreadsheetId: "sheet-id", cvText: CV, preferences: ["Remote work"] });

describe("analyzeJob with the assessor", () => {
  it("does not assess when neither a CV nor preferences are set", async () => {
    const { all, createAssessor } = deps();
    const result = await analyzeJob({}, all);

    expect(createAssessor).not.toHaveBeenCalled();
    expect(result.values.verdict).toBeNull();
    expect(result.assessmentError).toBeNull();
  });

  it.each([
    ["a CV", withCv],
    ["preferences", withPreferences],
  ])("assesses with only %s and merges the result into the values", async (_label, readSettings) => {
    const { all, assess, createAssessor } = deps({ readSettings });
    const result = await analyzeJob({}, all);

    expect(createAssessor).toHaveBeenCalledWith({ apiKey: "sk-test", model: appConfig.openaiModel });
    expect(assess).toHaveBeenCalledOnce();
    expect(result.values).toMatchObject({ company: "Ryvo", ...assessment });
    expect(result.assessmentError).toBeNull();
  });

  it("passes the page, the CV and the preferences, and uses the model from settings", async () => {
    const { all, assess, createAssessor } = deps({
      readSettings: () =>
        Promise.resolve({ openaiApiKey: "sk-test", openaiModel: "my-model", cvText: CV, preferences: ["Remote work"] }),
    });
    await analyzeJob({}, all);

    expect(createAssessor).toHaveBeenCalledWith({ apiKey: "sk-test", model: "my-model" });
    expect(assess).toHaveBeenCalledWith({ payload, cv: CV, preferences: ["Remote work"] });
  });

  it("starts the assessor before extraction has finished", async () => {
    let finishExtraction: (value: LlmJobValues) => void = () => undefined;
    const extract = vi.fn().mockReturnValue(new Promise<LlmJobValues>((resolve) => (finishExtraction = resolve)));
    const { all, assess } = deps({ readSettings: withCv, createExtractor: () => ({ extract }) });

    const running = analyzeJob({}, all);
    await vi.waitFor(() => expect(assess).toHaveBeenCalledOnce());
    expect(extract).toHaveBeenCalledOnce();

    finishExtraction(answer);
    await expect(running).resolves.toMatchObject({ values: { verdict: "high" } });
  });

  it("keeps the extracted form and reports why when the assessment fails", async () => {
    const { all, assess } = deps({ readSettings: withCv });
    assess.mockRejectedValue(new RateLimitError("OpenAI rate limit or quota reached."));

    const result = await analyzeJob({}, all);

    expect(result.values.company).toBe("Ryvo");
    expect(result.values.verdict).toBeNull();
    expect(result.assessmentError).toBe("OpenAI rate limit or quota reached.");
  });

  it("uses a generic message for an unexpected assessor failure, never the CV", async () => {
    const { all, assess } = deps({ readSettings: withCv });
    assess.mockRejectedValue(new Error(CV));

    const result = await analyzeJob({}, all);

    expect(result.assessmentError).toBe("Something went wrong while judging this job.");
    expect(result.assessmentError).not.toContain("secret-cv-marker");
  });

  it("still fails when extraction fails, without an unhandled rejection from the assessor", async () => {
    const extract = vi.fn().mockRejectedValue(new NetworkError("offline"));
    const { all, assess } = deps({ readSettings: withCv, createExtractor: () => ({ extract }) });
    assess.mockRejectedValue(new RateLimitError("limited"));

    await expect(analyzeJob({}, all)).rejects.toBeInstanceOf(NetworkError);
    await vi.waitFor(() => expect(assess).toHaveBeenCalledOnce());
  });

  it("calls neither model for a job already in the sheet, and returns its stored assessment", async () => {
    const { all, find, createExtractor, createAssessor } = deps({ readSettings: withCvAndSheet });
    find.mockResolvedValue({ row: 7, values: { ...saved.values, ...assessment } });

    const result = await analyzeJob({}, all);

    expect(createExtractor).not.toHaveBeenCalled();
    expect(createAssessor).not.toHaveBeenCalled();
    expect(result.values).toMatchObject(assessment);
  });

  it("with refresh, replaces the stored assessment with the new one", async () => {
    const { all, find } = deps({ readSettings: withCvAndSheet });
    find.mockResolvedValue({
      row: 7,
      values: { ...saved.values, cvFit: "Old.", preferenceFit: "No: Remote work", verdict: "low" },
    });

    const result = await analyzeJob({ refresh: true }, all);

    expect(result.existing).toBe(true);
    expect(result.values).toMatchObject(assessment);
  });

  it("with refresh, keeps the stored assessment when none is attempted or the attempt fails", async () => {
    const stored = { ...saved.values, cvFit: "Old.", preferenceFit: "No: Remote work", verdict: "low" };

    const off = deps({ readSettings: withSheet });
    off.find.mockResolvedValue({ row: 7, values: stored });
    expect((await analyzeJob({ refresh: true }, off.all)).values).toMatchObject({ verdict: "low", cvFit: "Old." });

    const failing = deps({ readSettings: withCvAndSheet });
    failing.find.mockResolvedValue({ row: 7, values: stored });
    failing.assess.mockRejectedValue(new RateLimitError("limited"));
    const result = await analyzeJob({ refresh: true }, failing.all);
    expect(result.values).toMatchObject({ verdict: "low", cvFit: "Old." });
    expect(result.assessmentError).toBe("limited");
  });
});

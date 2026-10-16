import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import type { LlmJobValues } from "@/config/fields";
import { AuthError, NetworkError, PageAccessError } from "@/core/errors";
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
  values: { company: "Ryvo", jobUrl: CLEAN_URL, status: "interviewing", skills: ["node.js"] },
};

function deps(overrides: Partial<AnalyzeDeps> = {}) {
  const extract = vi.fn().mockResolvedValue(answer);
  const createExtractor = vi.fn().mockReturnValue({ extract });
  const extractPage = vi.fn().mockResolvedValue(payload);
  const find = vi.fn().mockResolvedValue(null);
  const createSink = vi.fn().mockReturnValue({ find, save: vi.fn() });
  const all: AnalyzeDeps = {
    readSettings: () => Promise.resolve({ openaiApiKey: "sk-test" }),
    extractPage,
    createExtractor,
    createSink,
    ...overrides,
  };
  return { all, extract, createExtractor, extractPage, find, createSink };
}

const withSheet = () => Promise.resolve({ openaiApiKey: "sk-test", spreadsheetId: "sheet-id" });

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
    expect(result.existing).toBe(false);
    expect(result.values.platform).toBe("Jobstreet");
    expect(result.values.jobUrl).toBe(CLEAN_URL);
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

describe("analyzeJob with a spreadsheet", () => {
  it("skips the sheet lookup when no spreadsheet is configured", async () => {
    const { all, createSink } = deps();
    await analyzeJob(all);
    expect(createSink).not.toHaveBeenCalled();
  });

  it("looks up the clean job URL and still asks the model when it is not saved yet", async () => {
    const { all, find, createSink, extract } = deps({ readSettings: withSheet });
    const result = await analyzeJob(all);

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
    await analyzeJob(all);
    expect(createSink).toHaveBeenCalledWith("sheet-id", "Applications");
  });

  it("loads the saved row and skips OpenAI when the job is already in the sheet", async () => {
    const { all, find, createExtractor } = deps({ readSettings: withSheet });
    find.mockResolvedValue(saved);

    const result = await analyzeJob(all);

    expect(createExtractor).not.toHaveBeenCalled();
    expect(result.existing).toBe(true);
    expect(result.values).toBe(saved.values);
    expect(result.values.status).toBe("interviewing");
    expect(result.missing).toEqual([]);
  });

  it("surfaces a lookup failure instead of silently calling the model", async () => {
    const { all, find, createExtractor } = deps({ readSettings: withSheet });
    find.mockRejectedValue(new NetworkError("offline"));

    await expect(analyzeJob(all)).rejects.toBeInstanceOf(NetworkError);
    expect(createExtractor).not.toHaveBeenCalled();
  });
});

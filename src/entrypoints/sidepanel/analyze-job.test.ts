import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import type { AssessmentValues, LlmJobValues } from "@/config/fields";
import { AuthError, InputError, NetworkError, RateLimitError } from "@/core/errors";
import type { AnalyzeInput, MediaAttachment } from "@/core/types";

import { analyzeJob } from "./analyze-job";
import type { AnalyzeDeps } from "./analyze-job";

const INPUT: AnalyzeInput = { kind: "text", text: "  Build   things.  " };
const text = "Build things.";

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
  const transcribe = vi.fn().mockResolvedValue("  Read   from\nan image.  ");
  const createTranscriber = vi.fn().mockReturnValue({ transcribe });
  const extract = vi.fn().mockResolvedValue(answer);
  const createExtractor = vi.fn().mockReturnValue({ extract });
  const all: AnalyzeDeps = {
    readSettings: () => Promise.resolve({ openaiApiKey: "sk-test" }),
    createExtractor,
    createAssessor,
    createTranscriber,
    ...overrides,
  };
  return { all, extract, createExtractor, createAssessor, assess, createTranscriber, transcribe };
}

describe("analyzeJob", () => {
  it("fails with AuthError before asking the model when no key is saved", async () => {
    const { all, createExtractor } = deps({ readSettings: () => Promise.resolve({}) });
    await expect(analyzeJob(INPUT, all)).rejects.toBeInstanceOf(AuthError);
    expect(createExtractor).not.toHaveBeenCalled();
  });

  it("fails with an InputError, without calling the model, when there is no text", async () => {
    const { all, createExtractor } = deps();
    await expect(analyzeJob({ kind: "text", text: "   \n " }, all)).rejects.toBeInstanceOf(InputError);
    expect(createExtractor).not.toHaveBeenCalled();
  });

  it("sends the cleaned selection to the model and merges code-owned fields", async () => {
    const { all, extract, createExtractor } = deps();
    const result = await analyzeJob(INPUT, all);

    expect(extract).toHaveBeenCalledWith("Build things.");
    expect(createExtractor).toHaveBeenCalledWith({ apiKey: "sk-test", model: appConfig.openaiModel });
    expect(result.values.source).toBeNull();
    expect(result.values.sourceUrl).toBeNull();
    expect(result.values.skills).toEqual(["node.js"]);
    expect(result.missing).toContain("address");
  });

  it("gives every analysis a new job ID, even for the same text", async () => {
    const { all } = deps();
    const first = await analyzeJob(INPUT, all);
    const second = await analyzeJob(INPUT, all);

    expect(first.values.jobId).toMatch(/^[a-z0-9]{12}$/);
    expect(second.values.jobId).not.toBe(first.values.jobId);
  });

  it("runs without touching a spreadsheet, and asks the model every time", async () => {
    const { all, extract } = deps({
      readSettings: () => Promise.resolve({ openaiApiKey: "sk-test", spreadsheetId: "sheet-id" }),
    });
    await analyzeJob(INPUT, all);
    await analyzeJob(INPUT, all);
    expect(extract).toHaveBeenCalledTimes(2);
  });

  it("prefers the model saved in settings over the config default", async () => {
    const { all, createExtractor } = deps({
      readSettings: () => Promise.resolve({ openaiApiKey: "sk-test", openaiModel: "my-model" }),
    });
    await analyzeJob(INPUT, all);
    expect(createExtractor).toHaveBeenCalledWith({ apiKey: "sk-test", model: "my-model" });
  });
});

const photo: MediaAttachment = { name: "ad.png", mimeType: "image/png", dataUrl: "data:image/png;base64,AAAA" };
const media: AnalyzeInput = { kind: "media", items: [photo] };

describe("analyzeJob with images or a PDF", () => {
  it("reads the media first, then analyzes the transcribed text like any other text", async () => {
    const { all, transcribe, createTranscriber, extract } = deps();
    const result = await analyzeJob(media, all);

    expect(createTranscriber).toHaveBeenCalledWith({ apiKey: "sk-test", model: appConfig.openaiModel });
    expect(transcribe).toHaveBeenCalledWith([photo]);
    expect(extract).toHaveBeenCalledWith("Read from\nan image.");
    expect(result.values.company).toBe("Ryvo");
    expect(result.values.jobId).toMatch(/^[a-z0-9]{12}$/);
  });

  it("never reads media for text input", async () => {
    const { all, createTranscriber } = deps();
    await analyzeJob(INPUT, all);
    expect(createTranscriber).not.toHaveBeenCalled();
  });

  it("uses the model from settings for the transcription too", async () => {
    const { all, createTranscriber } = deps({
      readSettings: () => Promise.resolve({ openaiApiKey: "sk-test", openaiModel: "my-model" }),
    });
    await analyzeJob(media, all);
    expect(createTranscriber).toHaveBeenCalledWith({ apiKey: "sk-test", model: "my-model" });
  });

  it("skips both models when the media cannot be read", async () => {
    const { all, transcribe, createExtractor, createAssessor } = deps({
      readSettings: () => Promise.resolve({ openaiApiKey: "sk-test", preferences: ["Remote work"] }),
    });
    transcribe.mockRejectedValue(new InputError("Couldn't find any readable text in that."));

    await expect(analyzeJob(media, all)).rejects.toBeInstanceOf(InputError);
    expect(createExtractor).not.toHaveBeenCalled();
    expect(createAssessor).not.toHaveBeenCalled();
  });

  it("asks for a file when there is none", async () => {
    const { all, createTranscriber } = deps();
    await expect(analyzeJob({ kind: "media", items: [] }, all)).rejects.toBeInstanceOf(InputError);
    expect(createTranscriber).not.toHaveBeenCalled();
  });

  it("checks the key before reading anything", async () => {
    const { all, createTranscriber } = deps({ readSettings: () => Promise.resolve({}) });
    await expect(analyzeJob(media, all)).rejects.toBeInstanceOf(AuthError);
    expect(createTranscriber).not.toHaveBeenCalled();
  });
});

const withPreferences =() => Promise.resolve({ openaiApiKey: "sk-test", preferences: ["Remote work"] });

describe("analyzeJob with the assessor", () => {
  it("does not assess when no preferences are set", async () => {
    const { all, createAssessor } = deps();
    const result = await analyzeJob(INPUT, all);

    expect(createAssessor).not.toHaveBeenCalled();
    expect(result.values.preferenceFit).toBeNull();
    expect(result.assessmentError).toBeNull();
  });

  it("assesses with preferences and merges the result into the values", async () => {
    const { all, assess, createAssessor } = deps({ readSettings: withPreferences });
    const result = await analyzeJob(INPUT, all);

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
    await analyzeJob(INPUT, all);

    expect(createAssessor).toHaveBeenCalledWith({ apiKey: "sk-test", model: "my-model" });
    expect(assess).toHaveBeenCalledWith({ text, preferences: ["Remote work"] });
  });

  it("starts the assessor before extraction has finished", async () => {
    let finishExtraction: (value: LlmJobValues) => void = () => undefined;
    const extract = vi.fn().mockReturnValue(new Promise<LlmJobValues>((resolve) => (finishExtraction = resolve)));
    const { all, assess } = deps({ readSettings: withPreferences, createExtractor: () => ({ extract }) });

    const running = analyzeJob(INPUT, all);
    await vi.waitFor(() => expect(assess).toHaveBeenCalledOnce());
    expect(extract).toHaveBeenCalledOnce();

    finishExtraction(answer);
    await expect(running).resolves.toMatchObject({ values: { preferenceFit: "Yes: Remote work" } });
  });

  it("keeps the extracted form and reports why when the assessment fails", async () => {
    const { all, assess } = deps({ readSettings: withPreferences });
    assess.mockRejectedValue(new RateLimitError("OpenAI rate limit or quota reached."));

    const result = await analyzeJob(INPUT, all);

    expect(result.values.company).toBe("Ryvo");
    expect(result.values.preferenceFit).toBeNull();
    expect(result.assessmentError).toBe("OpenAI rate limit or quota reached.");
  });

  it("uses a generic message for an unexpected assessor failure, never its text", async () => {
    const { all, assess } = deps({ readSettings: withPreferences });
    assess.mockRejectedValue(new Error("secret-preference-marker"));

    const result = await analyzeJob(INPUT, all);

    expect(result.assessmentError).toBe("Something went wrong while judging this job.");
    expect(result.assessmentError).not.toContain("secret-preference-marker");
  });

  it("still fails when extraction fails, without an unhandled rejection from the assessor", async () => {
    const extract = vi.fn().mockRejectedValue(new NetworkError("offline"));
    const { all, assess } = deps({ readSettings: withPreferences, createExtractor: () => ({ extract }) });
    assess.mockRejectedValue(new RateLimitError("limited"));

    await expect(analyzeJob(INPUT, all)).rejects.toBeInstanceOf(NetworkError);
    await vi.waitFor(() => expect(assess).toHaveBeenCalledOnce());
  });
});

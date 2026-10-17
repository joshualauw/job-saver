import { appConfig } from "@/config/app";
import { jobLlmSchema } from "@/config/fields";
import type { AssessmentValues, JobFieldKey, LlmJobValues } from "@/config/fields";
import { platforms } from "@/config/platforms";
import { AppError, AuthError } from "@/core/errors";
import { resolveJobSource } from "@/core/job-source";
import type { PagePayload } from "@/core/page-payload";
import type { AssessmentInput, Assessor, Extractor, SavedJob, Sink } from "@/core/types";
import { createOpenAIAssessor } from "@/features/ai-assess/openai-assessor";
import { buildJobDraft } from "@/features/ai-extract/draft";
import { createOpenAIExtractor } from "@/features/ai-extract/openai-extractor";
import { extractActivePage } from "@/features/page-extract/extract-active-page";
import { readSettings } from "@/lib/storage";
import type { Settings } from "@/lib/storage";

import { createSink } from "./create-sink";

export interface AnalyzeResult {
  readonly payload: PagePayload;
  /** Values keyed by field key: a fresh AI draft, or the row already saved in the sheet. */
  readonly values: Readonly<Record<string, unknown>>;
  readonly missing: readonly JobFieldKey[];
  /** The job is already in the sheet, so `values` came from it and OpenAI was not called. */
  readonly existing: boolean;
  /** Why the assessment is missing, when it was attempted and failed; the form is still usable. */
  readonly assessmentError: string | null;
}

/** Everything that touches the outside world, injectable so the flow is testable. */
export interface AnalyzeDeps {
  readonly readSettings: () => Promise<Settings>;
  readonly extractPage: () => Promise<PagePayload>;
  readonly createExtractor: (options: { apiKey: string; model: string }) => Extractor<LlmJobValues>;
  readonly createAssessor: (options: { apiKey: string; model: string }) => Assessor<AssessmentValues>;
  readonly createSink: (spreadsheetId: string, tab: string) => Sink;
}

const defaultDeps: AnalyzeDeps = {
  readSettings: () => readSettings(),
  extractPage: extractActivePage,
  createExtractor: ({ apiKey, model }) => createOpenAIExtractor({ apiKey, model, schema: jobLlmSchema }),
  createAssessor: ({ apiKey, model }) => createOpenAIAssessor({ apiKey, model }),
  createSink,
};

export interface AnalyzeOptions {
  /** Ask the model again even though the job is already in the sheet, keeping the saved row as the base. */
  readonly refresh?: boolean;
}

/**
 * Composition root for "Analyze": read the page, reuse the saved row if the job is already in the
 * sheet, otherwise ask the model and merge with what code knows. With `refresh`, a saved row is
 * updated with what the model finds instead of being returned as is.
 */
export async function analyzeJob(
  { refresh = false }: AnalyzeOptions = {},
  deps: AnalyzeDeps = defaultDeps,
): Promise<AnalyzeResult> {
  const settings = await deps.readSettings();
  const apiKey = settings.openaiApiKey;
  if (!apiKey) throw new AuthError("Add your OpenAI API key first.");

  const payload = await deps.extractPage();
  const source = resolveJobSource(payload.url, platforms);

  let saved: SavedJob | null = null;
  if (settings.spreadsheetId && source) {
    const sink = deps.createSink(settings.spreadsheetId, settings.sheetTab ?? appConfig.defaultSheetTab);
    saved = await sink.find(source.jobUrl);
    // A job that is already saved keeps its saved values: no AI draft, no OpenAI cost.
    if (saved && !refresh) {
      return { payload, values: saved.values, missing: [], existing: true, assessmentError: null };
    }
  }

  const model = settings.openaiModel ?? appConfig.openaiModel;

  // Started before extraction is awaited so the two requests overlap. It never rejects, so a
  // failing extraction cannot leave it as an unhandled rejection.
  const cv = settings.cvText ?? null;
  const preferences = settings.preferences ?? [];
  const assessing =
    cv !== null || preferences.length > 0
      ? assess(deps.createAssessor({ apiKey, model }), { payload, cv, preferences })
      : null;

  const llm = await deps.createExtractor({ apiKey, model }).extract(payload);

  const draft = buildJobDraft({ source, llm, ...(saved && { saved: saved.values }) });

  const assessment = assessing ? await assessing : null;
  // A saved assessment survives when none was attempted or the attempt failed.
  const values = assessment?.ok ? { ...draft.values, ...assessment.values } : draft.values;
  return {
    payload,
    values,
    missing: draft.missing,
    existing: saved !== null,
    assessmentError: assessment && !assessment.ok ? assessment.message : null,
  };
}

type Assessed = { ok: true; values: AssessmentValues } | { ok: false; message: string };

/** The assessor's outcome as data: its failure must never lose the extracted form. */
async function assess(assessor: Assessor<AssessmentValues>, input: AssessmentInput): Promise<Assessed> {
  try {
    return { ok: true, values: await assessor.assess(input) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AppError ? error.message : "Something went wrong while judging this job.",
    };
  }
}

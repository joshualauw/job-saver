import { appConfig } from "@/config/app";
import { jobLlmSchema } from "@/config/fields";
import type { JobFieldKey, LlmJobValues } from "@/config/fields";
import { platforms } from "@/config/platforms";
import { AuthError } from "@/core/errors";
import { resolveJobSource } from "@/core/job-source";
import type { PagePayload } from "@/core/page-payload";
import type { Extractor, SavedJob, Sink } from "@/core/types";
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
}

/** Everything that touches the outside world, injectable so the flow is testable. */
export interface AnalyzeDeps {
  readonly readSettings: () => Promise<Settings>;
  readonly extractPage: () => Promise<PagePayload>;
  readonly createExtractor: (options: { apiKey: string; model: string }) => Extractor<LlmJobValues>;
  readonly createSink: (spreadsheetId: string, tab: string) => Sink;
}

const defaultDeps: AnalyzeDeps = {
  readSettings: () => readSettings(),
  extractPage: extractActivePage,
  createExtractor: ({ apiKey, model }) => createOpenAIExtractor({ apiKey, model, schema: jobLlmSchema }),
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
    // A job that is already saved keeps its real status: no AI draft, no OpenAI cost.
    if (saved && !refresh) return { payload, values: saved.values, missing: [], existing: true };
  }

  const extractor = deps.createExtractor({ apiKey, model: settings.openaiModel ?? appConfig.openaiModel });
  const llm = await extractor.extract(payload);

  const { values, missing } = buildJobDraft({
    source,
    llm,
    status: appConfig.defaultStatus,
    ...(saved && { saved: saved.values }),
  });
  return { payload, values, missing, existing: saved !== null };
}

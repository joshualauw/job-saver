import { appConfig } from "@/config/app";
import { jobLlmSchema } from "@/config/fields";
import type { JobFieldKey, LlmJobValues } from "@/config/fields";
import { platforms } from "@/config/platforms";
import { AuthError } from "@/core/errors";
import { resolveJobSource } from "@/core/job-source";
import type { PagePayload } from "@/core/page-payload";
import type { Extractor } from "@/core/types";
import { buildJobDraft } from "@/features/ai-extract/draft";
import type { JobDraft } from "@/features/ai-extract/draft";
import { createOpenAIExtractor } from "@/features/ai-extract/openai-extractor";
import { extractActivePage } from "@/features/page-extract/extract-active-page";
import { readSettings } from "@/lib/storage";
import type { Settings } from "@/lib/storage";

export interface AnalyzeResult {
  readonly payload: PagePayload;
  readonly values: JobDraft;
  readonly missing: readonly JobFieldKey[];
}

/** Everything that touches the outside world, injectable so the flow is testable. */
export interface AnalyzeDeps {
  readonly readSettings: () => Promise<Settings>;
  readonly extractPage: () => Promise<PagePayload>;
  readonly createExtractor: (options: { apiKey: string; model: string }) => Extractor<LlmJobValues>;
}

const defaultDeps: AnalyzeDeps = {
  readSettings: () => readSettings(),
  extractPage: extractActivePage,
  createExtractor: ({ apiKey, model }) => createOpenAIExtractor({ apiKey, model, schema: jobLlmSchema }),
};

/**
 * Composition root for "Analyze": read the page, ask the model, merge with what code knows.
 * Lives with the side panel because it wires two features together.
 */
export async function analyzeJob(deps: AnalyzeDeps = defaultDeps): Promise<AnalyzeResult> {
  const settings = await deps.readSettings();
  const apiKey = settings.openaiApiKey;
  if (!apiKey) throw new AuthError("Add your OpenAI API key first.");

  const payload = await deps.extractPage();

  const extractor = deps.createExtractor({ apiKey, model: settings.openaiModel ?? appConfig.openaiModel });
  const llm = await extractor.extract(payload);

  const { values, missing } = buildJobDraft({
    source: resolveJobSource(payload.url, platforms),
    llm,
    status: appConfig.defaultStatus,
  });
  return { payload, values, missing };
}

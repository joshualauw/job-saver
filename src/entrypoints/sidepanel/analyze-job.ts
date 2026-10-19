import { appConfig } from "@/config/app";
import { jobLlmSchema } from "@/config/fields";
import type { AssessmentValues, JobFieldKey, LlmJobValues } from "@/config/fields";
import { AppError, AuthError, InputError } from "@/core/errors";
import type { AnalyzeInput, AssessmentInput, Assessor, Extractor, Transcriber } from "@/core/types";
import { createOpenAIAssessor } from "@/features/ai-assess/openai-assessor";
import { buildJobDraft } from "@/features/ai-extract/draft";
import { createOpenAIExtractor } from "@/features/ai-extract/openai-extractor";
import { createOpenAITranscriber } from "@/features/ai-transcribe/openai-transcriber";
import { prepareJobText } from "@/features/job-input/job-text";
import { readSettings } from "@/lib/storage";
import type { Settings } from "@/lib/storage";

export interface AnalyzeResult {
  /** Values keyed by field key: a fresh AI draft with a newly minted job ID. */
  readonly values: Readonly<Record<string, unknown>>;
  readonly missing: readonly JobFieldKey[];
  /** Why the assessment is missing, when it was attempted and failed; the form is still usable. */
  readonly assessmentError: string | null;
}

/** Everything that touches the outside world, injectable so the flow is testable. */
export interface AnalyzeDeps {
  readonly readSettings: () => Promise<Settings>;
  readonly createExtractor: (options: { apiKey: string; model: string }) => Extractor<LlmJobValues>;
  readonly createAssessor: (options: { apiKey: string; model: string }) => Assessor<AssessmentValues>;
  readonly createTranscriber: (options: { apiKey: string; model: string }) => Transcriber;
}

const defaultDeps: AnalyzeDeps = {
  readSettings: () => readSettings(),
  createExtractor: ({ apiKey, model }) => createOpenAIExtractor({ apiKey, model, schema: jobLlmSchema }),
  createAssessor: ({ apiKey, model }) => createOpenAIAssessor({ apiKey, model }),
  createTranscriber: ({ apiKey, model }) => createOpenAITranscriber({ apiKey, model }),
};

/**
 * Composition root for "Analyze": get the posting's text (read out of images or a PDF first, when that
 * is what was given), ask the model about it and merge with what code knows. It never touches the
 * sheet, so it works before one is set up and every run is a fresh draft.
 */
export async function analyzeJob(input: AnalyzeInput, deps: AnalyzeDeps = defaultDeps): Promise<AnalyzeResult> {
  const settings = await deps.readSettings();
  const apiKey = settings.openaiApiKey;
  if (!apiKey) throw new AuthError("Add your OpenAI API key first.");

  const model = settings.openaiModel ?? appConfig.openaiModel;

  const text = input.kind === "text" ? input.text : await readMedia(input, deps, { apiKey, model });
  const jobText = prepareJobText(text, appConfig.maxJobTextChars);
  if (jobText === "") {
    throw new InputError("There is no text to analyze yet. Add some text, an image or a file first.");
  }

  // Started before extraction is awaited so the two requests overlap. It never rejects, so a
  // failing extraction cannot leave it as an unhandled rejection.
  const preferences = settings.preferences ?? [];
  const assessing =
    preferences.length > 0 ? assess(deps.createAssessor({ apiKey, model }), { text: jobText, preferences }) : null;

  const llm = await deps.createExtractor({ apiKey, model }).extract(jobText);

  const draft = buildJobDraft({ llm });

  const assessment = assessing ? await assessing : null;
  const values = assessment?.ok ? { ...draft.values, ...assessment.values } : draft.values;
  return {
    values,
    missing: draft.missing,
    assessmentError: assessment && !assessment.ok ? assessment.message : null,
  };
}

async function readMedia(
  input: Extract<AnalyzeInput, { kind: "media" }>,
  deps: AnalyzeDeps,
  options: { apiKey: string; model: string },
): Promise<string> {
  if (input.items.length === 0) throw new InputError("Add an image or a file first.");
  return deps.createTranscriber(options).transcribe(input.items);
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

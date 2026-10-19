import type { z } from "zod";

import type { Extractor } from "@/core/types";
import { createOpenAIClient, requestStructured } from "@/lib/openai";
import type { OpenAIClient } from "@/lib/openai";

import { buildPrompt } from "./prompt";

/** Name of the structured-output schema sent to OpenAI. */
const SCHEMA_NAME = "job_posting";

export interface OpenAIExtractorOptions<T> {
  readonly apiKey: string;
  readonly model: string;
  /** Strict-mode schema the model must satisfy (every key present, unknown = null). */
  readonly schema: z.ZodType<T>;
  readonly summaryLanguage?: string;
  /** Injectable for tests; defaults to a real browser-side client. */
  readonly client?: OpenAIClient;
}

export function createOpenAIExtractor<T>(options: OpenAIExtractorOptions<T>): Extractor<T> {
  const client = options.client ?? createOpenAIClient(options.apiKey);

  return {
    extract(text: string): Promise<T> {
      const prompt = buildPrompt(text, options.summaryLanguage);
      return requestStructured({
        client,
        model: options.model,
        system: prompt.system,
        user: prompt.user,
        schema: options.schema,
        schemaName: SCHEMA_NAME,
      });
    },
  };
}

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

import { SchemaError } from "@/core/errors";
import type { PagePayload } from "@/core/page-payload";
import type { Extractor } from "@/core/types";

import { mapOpenAIError } from "./map-openai-error";
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
  readonly client?: Pick<OpenAI, "responses">;
}

function findRefusal(output: readonly unknown[]): string | null {
  for (const item of output) {
    if (typeof item !== "object" || item === null || !("type" in item) || item.type !== "message") continue;
    const content = "content" in item && Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part === "object" && part !== null && "type" in part && part.type === "refusal") {
        return "refusal" in part && typeof part.refusal === "string" ? part.refusal : "refused";
      }
    }
  }
  return null;
}

export function createOpenAIExtractor<T>(options: OpenAIExtractorOptions<T>): Extractor<T> {
  // `dangerouslyAllowBrowser` is acceptable only because this is a personal, unpublished build
  // whose key lives in the user's own chrome.storage (see CLAUDE.md hard rule 10).
  const client = options.client ?? new OpenAI({ apiKey: options.apiKey, dangerouslyAllowBrowser: true });

  return {
    async extract(payload: PagePayload): Promise<T> {
      const prompt = buildPrompt(payload, options.summaryLanguage);

      let response;
      try {
        response = await client.responses.parse({
          model: options.model,
          // Job-page content is not kept on OpenAI's side.
          store: false,
          input: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          text: { format: zodTextFormat(options.schema, SCHEMA_NAME) },
        });
      } catch (error) {
        throw mapOpenAIError(error);
      }

      if (findRefusal(response.output) !== null) {
        throw new SchemaError("The model declined to read this posting.");
      }

      // The SDK already parsed against the schema; re-validate so nothing unvalidated escapes.
      const parsed = options.schema.safeParse(response.output_parsed);
      if (!parsed.success) {
        throw new SchemaError("The model's answer didn't match the expected format. Try again.", {
          cause: parsed.error,
        });
      }
      return parsed.data;
    },
  };
}

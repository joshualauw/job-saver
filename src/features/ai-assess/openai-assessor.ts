import type { AssessmentValues } from "@/config/fields";
import type { Assessor, AssessmentInput } from "@/core/types";
import { createOpenAIClient, requestStructured } from "@/lib/openai";
import type { OpenAIClient } from "@/lib/openai";

import { buildPrompt } from "./prompt";
import { assessmentAnswerSchema } from "./schema";
import { toAssessmentValues } from "./to-assessment-values";

/** Name of the structured-output schema sent to OpenAI. */
const SCHEMA_NAME = "job_assessment";

export interface OpenAIAssessorOptions {
  readonly apiKey: string;
  readonly model: string;
  /** Injectable for tests; defaults to a real browser-side client. */
  readonly client?: OpenAIClient;
}

export function createOpenAIAssessor(options: OpenAIAssessorOptions): Assessor<AssessmentValues> {
  const client = options.client ?? createOpenAIClient(options.apiKey);

  return {
    async assess(input: AssessmentInput): Promise<AssessmentValues> {
      const prompt = buildPrompt(input);
      const answer = await requestStructured({
        client,
        model: options.model,
        system: prompt.system,
        user: prompt.user,
        schema: assessmentAnswerSchema,
        schemaName: SCHEMA_NAME,
      });
      return toAssessmentValues(answer, input);
    },
  };
}

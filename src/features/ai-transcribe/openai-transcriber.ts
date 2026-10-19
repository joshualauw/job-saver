import { InputError } from "@/core/errors";
import type { MediaAttachment, Transcriber } from "@/core/types";
import { createOpenAIClient, requestText } from "@/lib/openai";
import type { OpenAIClient } from "@/lib/openai";

import { buildSystemPrompt, buildUserContent } from "./prompt";

export interface OpenAITranscriberOptions {
  readonly apiKey: string;
  readonly model: string;
  /** Injectable for tests; defaults to a real browser-side client. */
  readonly client?: OpenAIClient;
}

export function createOpenAITranscriber(options: OpenAITranscriberOptions): Transcriber {
  const client = options.client ?? createOpenAIClient(options.apiKey);

  return {
    async transcribe(items: readonly MediaAttachment[]): Promise<string> {
      const text = await requestText({
        client,
        model: options.model,
        system: buildSystemPrompt(),
        user: buildUserContent(items),
      });
      if (text.trim() === "") {
        throw new InputError("Couldn't find any readable text in that. Try a clearer image or another file.");
      }
      return text;
    },
  };
}

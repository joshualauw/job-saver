import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

import { AppError, AuthError, NetworkError, RateLimitError, SchemaError, UnexpectedError } from "@/core/errors";

/** The part of the SDK the app uses; tests inject a fake. */
export type OpenAIClient = Pick<OpenAI, "responses">;

export function createOpenAIClient(apiKey: string): OpenAIClient {
  // `dangerouslyAllowBrowser` is acceptable only because this is a personal, unpublished build
  // whose key lives in the user's own chrome.storage (see CLAUDE.md).
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

function readStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) return null;
  return typeof error.status === "number" ? error.status : null;
}

function readName(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

/**
 * Maps whatever the OpenAI SDK (or `fetch`) threw to an `AppError` with a user-safe message.
 * Duck-typed on `status` / `name` so tests need no SDK classes. Messages never include the API
 * key or any request content; the original error is kept only as `cause`.
 */
export function mapOpenAIError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const status = readStatus(error);
  const name = readName(error);
  const options = { cause: error };

  if (status === 401 || status === 403) {
    return new AuthError("OpenAI rejected the API key. Check the key and try again.", options);
  }
  if (status === 429) {
    return new RateLimitError(
      "OpenAI rate limit or quota reached. Wait a moment, or check your usage and billing.",
      options,
    );
  }
  if (status !== null && status >= 500) {
    return new NetworkError("OpenAI is having trouble right now. Try again shortly.", options);
  }
  if (status !== null && status >= 400) {
    return new UnexpectedError(
      `OpenAI rejected the request (status ${status}). Check the model name; it may not support structured outputs, images or files.`,
      options,
    );
  }
  if (name === "APIConnectionError" || name === "APIConnectionTimeoutError" || error instanceof TypeError) {
    return new NetworkError("Couldn't reach OpenAI. Check your connection and try again.", options);
  }
  if (name === "LengthFinishReasonError" || name === "ContentFilterFinishReasonError") {
    return new SchemaError("The model's answer was cut off or blocked. Try again.", options);
  }
  return new UnexpectedError("Something went wrong while asking OpenAI.", options);
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

export interface StructuredRequest<T> {
  readonly client: OpenAIClient;
  readonly model: string;
  /** Rules only; never page or personal content. */
  readonly system: string;
  readonly user: string;
  /** Strict-mode schema the model must satisfy. */
  readonly schema: z.ZodType<T>;
  /** Name of the structured-output schema sent to OpenAI. */
  readonly schemaName: string;
}

/**
 * One structured-output call. Nothing is kept on OpenAI's side (`store: false`), a refusal or an
 * answer that breaks the schema is a `SchemaError`, and SDK failures become typed errors whose
 * messages never include the key or any request content.
 */
export async function requestStructured<T>(request: StructuredRequest<T>): Promise<T> {
  let response;
  try {
    response = await request.client.responses.parse({
      model: request.model,
      store: false,
      input: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      text: { format: zodTextFormat(request.schema, request.schemaName) },
    });
  } catch (error) {
    throw mapOpenAIError(error);
  }

  if (findRefusal(response.output) !== null) {
    throw new SchemaError("The model declined to answer for this posting.");
  }

  // The SDK already parsed against the schema; re-validate so nothing unvalidated escapes.
  const parsed = request.schema.safeParse(response.output_parsed);
  if (!parsed.success) {
    throw new SchemaError("The model's answer didn't match the expected format. Try again.", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export interface TextRequest {
  readonly client: OpenAIClient;
  readonly model: string;
  /** Rules only; never page or personal content. */
  readonly system: string;
  /** The user message: text, images and files. */
  readonly user: OpenAI.Responses.ResponseInputMessageContentList;
}

/**
 * One plain-text call (for reading images and PDFs). Same guarantees as `requestStructured`: nothing
 * is kept on OpenAI's side, a refusal is a `SchemaError`, and failures become typed errors.
 */
export async function requestText(request: TextRequest): Promise<string> {
  let response;
  try {
    response = await request.client.responses.create({
      model: request.model,
      store: false,
      input: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    });
  } catch (error) {
    throw mapOpenAIError(error);
  }

  if (findRefusal(response.output) !== null) {
    throw new SchemaError("The model declined to read this file.");
  }
  return response.output_text;
}

import { AppError, AuthError, NetworkError, RateLimitError, SchemaError, UnexpectedError } from "@/core/errors";

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
      `OpenAI rejected the request (status ${status}). Check the model name; it may not support structured outputs.`,
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

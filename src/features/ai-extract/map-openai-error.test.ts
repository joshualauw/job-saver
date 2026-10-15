import { describe, expect, it } from "vitest";

import { AppError, AuthError, NetworkError, RateLimitError, SchemaError, UnexpectedError } from "@/core/errors";

import { mapOpenAIError } from "./map-openai-error";

const KEY = "sk-secret-key-123";

function httpError(status: number): Error {
  return Object.assign(new Error(`Incorrect API key provided: ${KEY}`), { status });
}

function named(name: string): Error {
  return Object.assign(new Error(`failure with ${KEY}`), { name });
}

describe("mapOpenAIError", () => {
  it.each([401, 403])("maps %i to AuthError", (status) => {
    expect(mapOpenAIError(httpError(status))).toBeInstanceOf(AuthError);
  });

  it("maps 429 to RateLimitError", () => {
    expect(mapOpenAIError(httpError(429))).toBeInstanceOf(RateLimitError);
  });

  it("maps 5xx and connection failures to NetworkError", () => {
    expect(mapOpenAIError(httpError(503))).toBeInstanceOf(NetworkError);
    expect(mapOpenAIError(named("APIConnectionError"))).toBeInstanceOf(NetworkError);
    expect(mapOpenAIError(named("APIConnectionTimeoutError"))).toBeInstanceOf(NetworkError);
    expect(mapOpenAIError(new TypeError("Failed to fetch"))).toBeInstanceOf(NetworkError);
  });

  it("maps other 4xx to an UnexpectedError that points at the model", () => {
    const mapped = mapOpenAIError(httpError(404));
    expect(mapped).toBeInstanceOf(UnexpectedError);
    expect(mapped.message).toMatch(/status 404/);
    expect(mapped.message).toMatch(/model/i);
  });

  it("maps cut-off or blocked answers to SchemaError", () => {
    expect(mapOpenAIError(named("LengthFinishReasonError"))).toBeInstanceOf(SchemaError);
    expect(mapOpenAIError(named("ContentFilterFinishReasonError"))).toBeInstanceOf(SchemaError);
  });

  it("falls back to UnexpectedError for anything else", () => {
    expect(mapOpenAIError(new Error("boom"))).toBeInstanceOf(UnexpectedError);
    expect(mapOpenAIError("a string")).toBeInstanceOf(UnexpectedError);
    expect(mapOpenAIError(undefined)).toBeInstanceOf(UnexpectedError);
  });

  it("passes AppErrors through unchanged", () => {
    const original = new SchemaError("already ours");
    expect(mapOpenAIError(original)).toBe(original);
  });

  it("never leaks the key in a user-facing message, but keeps the cause", () => {
    const cases = [httpError(401), httpError(429), httpError(500), httpError(400), named("APIConnectionError")];
    for (const error of cases) {
      const mapped = mapOpenAIError(error);
      expect(mapped).toBeInstanceOf(AppError);
      expect(mapped.message).not.toContain(KEY);
      expect(mapped.cause).toBe(error);
    }
  });
});

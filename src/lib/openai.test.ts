import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppError, AuthError, NetworkError, RateLimitError, SchemaError, UnexpectedError } from "@/core/errors";

import { mapOpenAIError, requestStructured } from "./openai";
import type { OpenAIClient } from "./openai";

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

describe("requestStructured", () => {
  const schema = z.object({ value: z.string() });

  function clientReturning(result: unknown) {
    const parse = vi.fn().mockResolvedValue(result);
    return { client: { responses: { parse } } as unknown as OpenAIClient, parse };
  }

  const ask = (client: OpenAIClient) =>
    requestStructured({ client, model: "m", system: "rules", user: "content", schema, schemaName: "thing" });

  it("returns the validated answer", async () => {
    const { client } = clientReturning({ output: [], output_parsed: { value: "ok" } });
    await expect(ask(client)).resolves.toEqual({ value: "ok" });
  });

  it("sends the model, store:false, a system and a user message and the strict schema", async () => {
    const { client, parse } = clientReturning({ output: [], output_parsed: { value: "ok" } });
    await ask(client);

    const request = parse.mock.calls[0]?.[0] as {
      model: string;
      store: boolean;
      input: { role: string; content: string }[];
      text: { format: { name: string; strict: boolean } };
    };
    expect(request.model).toBe("m");
    expect(request.store).toBe(false);
    expect(request.input).toEqual([
      { role: "system", content: "rules" },
      { role: "user", content: "content" },
    ]);
    expect(request.text.format).toMatchObject({ name: "thing", strict: true });
  });

  it("throws SchemaError for a refusal, a missing answer and a wrong shape", async () => {
    const refusal = {
      output: [{ type: "message", content: [{ type: "refusal", refusal: "No." }] }],
      output_parsed: null,
    };
    await expect(ask(clientReturning(refusal).client)).rejects.toBeInstanceOf(SchemaError);
    await expect(ask(clientReturning({ output: [], output_parsed: null }).client)).rejects.toBeInstanceOf(SchemaError);
    await expect(ask(clientReturning({ output: [], output_parsed: { value: 1 } }).client)).rejects.toBeInstanceOf(
      SchemaError,
    );
  });

  it("maps SDK failures to typed errors", async () => {
    const parse = vi.fn().mockRejectedValue(httpError(401));
    const client = { responses: { parse } } as unknown as OpenAIClient;
    await expect(ask(client)).rejects.toBeInstanceOf(AuthError);
  });
});

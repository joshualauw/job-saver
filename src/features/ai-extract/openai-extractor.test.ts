import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { fields, jobLlmSchema } from "@/config/fields";
import type { LlmJobValues } from "@/config/fields";
import { AuthError, NetworkError, RateLimitError, SchemaError } from "@/core/errors";

import { createOpenAIExtractor } from "./openai-extractor";

const text = "Build things.";

const aiKeys = fields.filter((field) => field.owner === "ai").map((field) => field.key);

const answer: LlmJobValues = {
  company: "Ryvo",
  jobTitle: "Senior Full-Stack Developer",
  address: "Jakarta Raya",
  contractType: "full_time",
  locationType: "remote",
  minYoe: null,
  skills: ["node.js"],
  salaryPeriod: "hour",
  salaryCurrency: "IDR",
  minSalary: 70_000,
  maxSalary: null,
  summary: "Builds custom software.",
  notes: null,
};

type FakeClient = Pick<OpenAI, "responses">;

function fakeClient(result: unknown) {
  const parse = vi.fn().mockResolvedValue(result);
  return { client: { responses: { parse } } as unknown as FakeClient, parse };
}

function failingClient(error: unknown) {
  const parse = vi.fn().mockRejectedValue(error);
  return { responses: { parse } } as unknown as FakeClient;
}

function extractor(client: FakeClient) {
  return createOpenAIExtractor({ apiKey: "sk-test", model: "test-model", schema: jobLlmSchema, client });
}

describe("createOpenAIExtractor", () => {
  it("returns the validated model output", async () => {
    const { client } = fakeClient({ output: [], output_parsed: answer });
    await expect(extractor(client).extract(text)).resolves.toEqual(answer);
  });

  it("sends the configured model, store:false, both messages and the strict schema", async () => {
    const { client, parse } = fakeClient({ output: [], output_parsed: answer });
    await extractor(client).extract(text);

    expect(parse).toHaveBeenCalledOnce();
    const request = parse.mock.calls[0]?.[0] as {
      model: string;
      store: boolean;
      input: { role: string; content: string }[];
      text: { format: { type: string; name: string; strict: boolean; schema: Record<string, unknown> } };
    };

    expect(request.model).toBe("test-model");
    expect(request.store).toBe(false);
    expect(request.input.map((message) => message.role)).toEqual(["system", "user"]);
    expect(request.input[0]?.content).not.toContain("Build things.");
    expect(request.input[1]?.content).toContain("<job_description>\nBuild things.\n</job_description>");

    const { format } = request.text;
    expect(format.type).toBe("json_schema");
    expect(format.name).toBe("job_posting");
    expect(format.strict).toBe(true);

    const schema = format.schema as {
      required: string[];
      additionalProperties: boolean;
      properties: Record<string, { type?: string; description?: string }>;
    };
    expect([...schema.required].sort()).toEqual([...aiKeys].sort());
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties["skills"]?.type).toBe("array");
    expect(schema.properties["company"]?.description).toMatch(/hiring company/i);
  });

  it("throws SchemaError when the model refuses", async () => {
    const refusal = {
      output: [{ type: "message", content: [{ type: "refusal", refusal: "I can't help with that." }] }],
      output_parsed: null,
    };
    await expect(extractor(fakeClient(refusal).client).extract(text)).rejects.toBeInstanceOf(SchemaError);
  });

  it("throws SchemaError when nothing was parsed", async () => {
    const { client } = fakeClient({ output: [], output_parsed: null });
    await expect(extractor(client).extract(text)).rejects.toBeInstanceOf(SchemaError);
  });

  it("throws SchemaError when the parsed output breaks the schema", async () => {
    const { client } = fakeClient({ output: [], output_parsed: { ...answer, company: 42 } });
    await expect(extractor(client).extract(text)).rejects.toBeInstanceOf(SchemaError);
  });

  it("maps SDK failures to typed errors", async () => {
    const withStatus = (status: number) => Object.assign(new Error("api"), { status });

    await expect(extractor(failingClient(withStatus(401))).extract(text)).rejects.toBeInstanceOf(AuthError);
    await expect(extractor(failingClient(withStatus(429))).extract(text)).rejects.toBeInstanceOf(RateLimitError);
    await expect(extractor(failingClient(new TypeError("Failed to fetch"))).extract(text)).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});

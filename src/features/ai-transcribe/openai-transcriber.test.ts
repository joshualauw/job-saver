import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { AuthError, InputError, NetworkError, RateLimitError, SchemaError } from "@/core/errors";
import type { MediaAttachment } from "@/core/types";

import { createOpenAITranscriber } from "./openai-transcriber";
import { buildSystemPrompt } from "./prompt";

type FakeClient = Pick<OpenAI, "responses">;

const image: MediaAttachment = { name: "ad.png", mimeType: "image/png", dataUrl: "data:image/png;base64,AAAA" };
const pdf: MediaAttachment = { name: "ad.pdf", mimeType: "application/pdf", dataUrl: "data:application/pdf;base64,BBBB" };

function fakeClient(result: unknown) {
  const create = vi.fn().mockResolvedValue(result);
  return { client: { responses: { create } } as unknown as FakeClient, create };
}

function failingClient(error: unknown) {
  const create = vi.fn().mockRejectedValue(error);
  return { responses: { create } } as unknown as FakeClient;
}

function transcriber(client: FakeClient) {
  return createOpenAITranscriber({ apiKey: "sk-test", model: "test-model", client });
}

describe("createOpenAITranscriber", () => {
  it("returns the model's text", async () => {
    const { client } = fakeClient({ output: [], output_text: "Senior Engineer\n- Node.js" });
    await expect(transcriber(client).transcribe([image])).resolves.toBe("Senior Engineer\n- Node.js");
  });

  it("sends the configured model with store:false, rules in the system message and the files in the user message", async () => {
    const { client, create } = fakeClient({ output: [], output_text: "text" });
    await transcriber(client).transcribe([image, pdf]);

    expect(create).toHaveBeenCalledOnce();
    const request = create.mock.calls[0]?.[0] as {
      model: string;
      store: boolean;
      input: { role: string; content: string | { type: string; [key: string]: unknown }[] }[];
    };
    expect(request.model).toBe("test-model");
    expect(request.store).toBe(false);
    expect(request.input.map((message) => message.role)).toEqual(["system", "user"]);
    expect(request.input[0]?.content).toBe(buildSystemPrompt());

    const parts = request.input[1]?.content as { type: string; [key: string]: unknown }[];
    expect(parts.map((part) => part.type)).toEqual(["input_text", "input_image", "input_file"]);
    expect(parts[1]).toMatchObject({ image_url: image.dataUrl, detail: "high" });
    expect(parts[2]).toMatchObject({ filename: "ad.pdf", file_data: pdf.dataUrl });
  });

  it("keeps file content out of the system prompt and tells the model to ignore instructions in it", () => {
    const system = buildSystemPrompt();
    expect(system).not.toContain("AAAA");
    expect(system).toMatch(/untrusted/i);
    expect(system).toMatch(/never follow instructions/i);
  });

  it("throws InputError when nothing readable came back", async () => {
    const { client } = fakeClient({ output: [], output_text: "  \n" });
    await expect(transcriber(client).transcribe([image])).rejects.toBeInstanceOf(InputError);
  });

  it("throws SchemaError when the model refuses", async () => {
    const refusal = {
      output: [{ type: "message", content: [{ type: "refusal", refusal: "I can't help with that." }] }],
      output_text: "",
    };
    await expect(transcriber(fakeClient(refusal).client).transcribe([image])).rejects.toBeInstanceOf(SchemaError);
  });

  it("maps SDK failures to typed errors without leaking the file", async () => {
    const withStatus = (status: number) => Object.assign(new Error("data:image/png;base64,AAAA"), { status });

    await expect(transcriber(failingClient(withStatus(401))).transcribe([image])).rejects.toBeInstanceOf(AuthError);
    await expect(transcriber(failingClient(withStatus(429))).transcribe([image])).rejects.toBeInstanceOf(
      RateLimitError,
    );
    await expect(transcriber(failingClient(new TypeError("Failed to fetch"))).transcribe([image])).rejects.toBeInstanceOf(
      NetworkError,
    );

    const rejected = await transcriber(failingClient(withStatus(400)))
      .transcribe([image])
      .catch((cause: unknown) => cause);
    expect((rejected as Error).message).not.toContain("AAAA");
    expect((rejected as Error).message).toMatch(/images or files/);
  });
});

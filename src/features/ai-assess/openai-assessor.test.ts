import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import { platforms } from "@/config/platforms";
import { AuthError, NetworkError, RateLimitError, SchemaError } from "@/core/errors";
import type { PagePayload } from "@/core/page-payload";
import type { AssessmentInput } from "@/core/types";
import { buildPagePayload } from "@/features/page-extract/extract-page";

import { loadFixture } from "../../../tests/helpers/fixtures";

import { createOpenAIAssessor } from "./openai-assessor";
import type { AssessmentAnswer } from "./schema";

const payload: PagePayload = {
  url: "https://id.jobstreet.com/id/job/1",
  title: "Dev - Jobstreet",
  facts: { Salary: "Rp 70,000 per hour" },
  description: "Build things with Node.js.",
  jsonLd: [],
  contentSource: "platform",
};

const PREFERENCE = "Experience with secret-preference-marker";
const input: AssessmentInput = { payload, preferences: ["Remote work", PREFERENCE] };

const answer: AssessmentAnswer = {
  preferences: [
    { number: 1, answer: "yes" },
    { number: 2, answer: "no" },
  ],
};

type FakeClient = Pick<OpenAI, "responses">;

function fakeClient(result: unknown) {
  const parse = vi.fn().mockResolvedValue(result);
  return { client: { responses: { parse } } as unknown as FakeClient, parse };
}

function failingClient(error: unknown) {
  return { responses: { parse: vi.fn().mockRejectedValue(error) } } as unknown as FakeClient;
}

function assessor(client: FakeClient) {
  return createOpenAIAssessor({ apiKey: "sk-test", model: "test-model", client });
}

describe("createOpenAIAssessor", () => {
  it("returns the answer as field values", async () => {
    const { client } = fakeClient({ output: [], output_parsed: answer });
    await expect(assessor(client).assess(input)).resolves.toEqual({
      preferenceFit: `Yes: Remote work\nNo: ${PREFERENCE}`,
    });
  });

  it("sends the configured model, store:false, and the preferences and page only in the user message", async () => {
    const { client, parse } = fakeClient({ output: [], output_parsed: answer });
    await assessor(client).assess(input);

    const request = parse.mock.calls[0]?.[0] as {
      model: string;
      store: boolean;
      input: { role: string; content: string }[];
      text: { format: { name: string; strict: boolean } };
    };
    expect(request.model).toBe("test-model");
    expect(request.store).toBe(false);
    expect(request.input.map((message) => message.role)).toEqual(["system", "user"]);
    expect(request.input[0]?.content).not.toContain("secret-preference-marker");
    expect(request.input[0]?.content).not.toContain("Build things");
    expect(request.input[1]?.content).toContain("secret-preference-marker");
    expect(request.input[1]?.content).toContain("Build things with Node.js.");
    expect(request.text.format.name).toBe("job_assessment");
    expect(request.text.format.strict).toBe(true);
  });

  it("throws SchemaError when the model refuses", async () => {
    const refusal = {
      output: [{ type: "message", content: [{ type: "refusal", refusal: "No." }] }],
      output_parsed: null,
    };
    await expect(assessor(fakeClient(refusal).client).assess(input)).rejects.toBeInstanceOf(SchemaError);
  });

  it("throws SchemaError when the answer breaks the schema or misses a preference", async () => {
    const broken = fakeClient({
      output: [],
      output_parsed: { ...answer, preferences: [{ number: 1, answer: "maybe" }] },
    }).client;
    await expect(assessor(broken).assess(input)).rejects.toBeInstanceOf(SchemaError);

    const short = fakeClient({ output: [], output_parsed: { ...answer, preferences: [answer.preferences[0]] } }).client;
    await expect(assessor(short).assess(input)).rejects.toBeInstanceOf(SchemaError);
  });

  it("maps SDK failures to typed errors that never contain the preferences", async () => {
    const withStatus = (status: number) => Object.assign(new Error(`failed for ${PREFERENCE}`), { status });

    await expect(assessor(failingClient(withStatus(401))).assess(input)).rejects.toBeInstanceOf(AuthError);
    await expect(assessor(failingClient(withStatus(429))).assess(input)).rejects.toBeInstanceOf(RateLimitError);
    const network = await assessor(failingClient(new TypeError(PREFERENCE)))
      .assess(input)
      .catch((cause: unknown) => cause);
    expect(network).toBeInstanceOf(NetworkError);
    expect((network as NetworkError).message).not.toContain("secret-preference-marker");
  });
});

describe.each(["1", "2", "3"])("assessing the Jobstreet fixture %s", (name) => {
  const page = buildPagePayload(loadFixture("jobstreet", name).document, {
    platforms,
    maxChars: appConfig.maxPageTextChars,
    selection: null,
  });

  it("sends the page's facts and description and maps a hand-written answer", async () => {
    const { client, parse } = fakeClient({ output: [], output_parsed: answer });
    const values = await assessor(client).assess({ ...input, payload: page });

    const user = (parse.mock.calls[0]?.[0] as { input: { content: string }[] }).input[1]?.content ?? "";
    expect(user).toContain("<job_description>");
    expect(user).toContain(Object.keys(page.facts)[0] ?? "<facts>");
    expect(values.preferenceFit?.split("\n")).toHaveLength(2);
  });
});

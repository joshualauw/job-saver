import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AuthError, NetworkError, RateLimitError, SchemaError, UnexpectedError } from "@/core/errors";

import type { GoogleAuth } from "./google-auth";
import { createSheetsClient } from "./sheets-client";

const TOKEN = "secret-token-1";
const okSchema = z.object({ ok: z.boolean() });

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function setup(responses: (Response | Error)[], tokens: string[] = [TOKEN, "secret-token-2"]) {
  const queue = [...responses];
  const fetchMock = vi.fn(() => {
    const next = queue.shift();
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next ?? json(500, {}));
  });
  const issued = [...tokens];
  const auth: GoogleAuth = {
    getToken: vi.fn(() => Promise.resolve(issued.shift() ?? "no-more-tokens")),
    dropToken: vi.fn(() => Promise.resolve()),
  };
  const client = createSheetsClient({
    spreadsheetId: "sheet-id",
    tab: "Jobs",
    auth,
    fetch: fetchMock as unknown as typeof fetch,
  });
  return { client, auth, fetchMock };
}

describe("createSheetsClient", () => {
  it("sends an authorised GET to the spreadsheet and returns the parsed body", async () => {
    const { client, fetchMock } = setup([json(200, { ok: true })]);

    await expect(client.get("values/x", okSchema)).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values/x");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${TOKEN}`);
  });

  it("posts a JSON body", async () => {
    const { client, fetchMock } = setup([json(200, { ok: true })]);
    await client.post("values:batchUpdate", { a: 1 }, okSchema);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("reports a successful response that is not JSON as a SchemaError", async () => {
    const { client } = setup([new Response("<html>sign in</html>", { status: 200 })]);

    await expect(client.get("values/x", okSchema)).rejects.toBeInstanceOf(SchemaError);
  });

  it("drops a rejected token and retries once with a fresh one", async () => {
    const { client, auth, fetchMock } = setup([json(401, {}), json(200, { ok: true })]);

    await expect(client.get("values/x", okSchema)).resolves.toEqual({ ok: true });

    expect(auth.dropToken).toHaveBeenCalledWith(TOKEN);
    const [, retry] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect((retry.headers as Record<string, string>)["Authorization"]).toBe("Bearer secret-token-2");
  });

  it("gives up with AuthError when the retry is rejected too", async () => {
    const { client, fetchMock } = setup([json(401, {}), json(401, {})]);
    await expect(client.get("values/x", okSchema)).rejects.toBeInstanceOf(AuthError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [403, AuthError],
    [404, UnexpectedError],
    [429, RateLimitError],
    [500, NetworkError],
    [503, NetworkError],
  ])("maps HTTP %i to the right error type", async (status, expected) => {
    const { client } = setup([json(status, { error: { message: "nope" } })]);
    await expect(client.get("values/x", okSchema)).rejects.toBeInstanceOf(expected);
  });

  it("names the missing tab when Google cannot parse the range", async () => {
    const { client } = setup([json(400, { error: { message: "Unable to parse range: 'Jobs'" } })]);
    await expect(client.get("values/x", okSchema)).rejects.toThrow('no tab named "Jobs"');
  });

  it("passes Google's reason through for other 400s", async () => {
    const { client } = setup([json(400, { error: { message: "Invalid value at 'data'" } })]);
    await expect(client.get("values/x", okSchema)).rejects.toThrow("Invalid value at 'data'");
  });

  it("maps a failed fetch to NetworkError", async () => {
    const { client } = setup([new TypeError("Failed to fetch")]);
    await expect(client.get("values/x", okSchema)).rejects.toBeInstanceOf(NetworkError);
  });

  it("rejects a response that does not match the schema", async () => {
    const { client } = setup([json(200, { ok: "yes" })]);
    await expect(client.get("values/x", okSchema)).rejects.toBeInstanceOf(SchemaError);
  });

  it("never puts the token in an error message", async () => {
    const statuses = [401, 403, 404, 429, 500, 400];
    for (const status of statuses) {
      const { client } = setup([json(status, { error: { message: "denied" } }), json(status, {})]);
      const error = await client.get("values/x", okSchema).catch((caught: unknown) => caught);
      expect((error as Error).message).not.toContain("secret-token");
    }
  });
});

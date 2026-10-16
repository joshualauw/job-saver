import { z } from "zod";

import { AuthError, NetworkError, RateLimitError, SchemaError, UnexpectedError } from "@/core/errors";

import type { GoogleAuth } from "./google-auth";

const API_ROOT = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetsClientOptions {
  readonly spreadsheetId: string;
  /** Used only to word the "tab not found" error. */
  readonly tab: string;
  readonly auth: GoogleAuth;
  /** Injectable for tests. */
  readonly fetch?: typeof fetch;
}

export interface SheetsClient {
  /** `path` is relative to the spreadsheet, e.g. `values/'Jobs'`. */
  get<T>(path: string, schema: z.ZodType<T>): Promise<T>;
  post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T>;
}

const errorBody = z.object({ error: z.object({ message: z.string() }).optional() });

/** Google's message is safe to show (it never contains the token) but is capped for the UI. */
async function readGoogleMessage(response: Response): Promise<string> {
  try {
    const parsed = errorBody.safeParse(await response.json());
    return parsed.success ? (parsed.data.error?.message ?? "").slice(0, 200) : "";
  } catch {
    return "";
  }
}

async function toError(response: Response, tab: string): Promise<Error> {
  const status = response.status;
  const message = await readGoogleMessage(response);

  if (status === 401 || status === 403) {
    return new AuthError("Google denied access to this spreadsheet. Check the ID and that your account can edit it.");
  }
  if (status === 404) {
    return new UnexpectedError("Spreadsheet not found. Check the spreadsheet ID in the panel.");
  }
  if (status === 429) {
    return new RateLimitError("Google Sheets rate limit reached. Wait a moment and try again.");
  }
  if (status >= 500) {
    return new NetworkError("Google Sheets is having trouble right now. Try again shortly.");
  }
  if (/unable to parse range/i.test(message)) {
    return new UnexpectedError(`The spreadsheet has no tab named "${tab}".`);
  }
  return new UnexpectedError(`Google Sheets rejected the request${message ? `: ${message}` : "."}`);
}

export function createSheetsClient({
  spreadsheetId,
  tab,
  auth,
  fetch: doFetch = fetch,
}: SheetsClientOptions): SheetsClient {
  const base = `${API_ROOT}/${encodeURIComponent(spreadsheetId)}`;

  async function send(path: string, init: { method: string; body?: unknown }, token: string): Promise<Response> {
    try {
      return await doFetch(`${base}/${path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch (cause) {
      throw new NetworkError("Couldn't reach Google Sheets. Check your connection and try again.", { cause });
    }
  }

  async function request<T>(path: string, init: { method: string; body?: unknown }, schema: z.ZodType<T>): Promise<T> {
    let token = await auth.getToken();
    let response = await send(path, init, token);

    // An expired cached token is the common 401: drop it and retry once with a fresh one.
    if (response.status === 401) {
      await auth.dropToken(token);
      token = await auth.getToken();
      response = await send(path, init, token);
    }

    if (!response.ok) throw await toError(response, tab);

    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      throw new SchemaError("Google Sheets returned data in an unexpected format.", { cause: parsed.error });
    }
    return parsed.data;
  }

  return {
    get: (path, schema) => request(path, { method: "GET" }, schema),
    post: (path, body, schema) => request(path, { method: "POST", body }, schema),
  };
}

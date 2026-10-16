import { z } from "zod";

import { sessionGet, sessionSet, storageGet, storageSet } from "./chrome";

const SETTINGS_KEY = "settings";
const DRAFT_KEY = "draft";

const optionalText = z.string().trim().optional();

export const settingsSchema = z.object({
  openaiApiKey: optionalText,
  openaiModel: optionalText,
  /** ID of the Google spreadsheet jobs are saved to (not a secret). */
  spreadsheetId: optionalText,
  /** Tab holding the jobs; falls back to the config default when unset. */
  sheetTab: optionalText,
});

export type Settings = z.infer<typeof settingsSchema>;

/** Minimal key/value port so the module is testable without `chrome`. */
export interface StorageAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const chromeAdapter: StorageAdapter = { get: storageGet, set: storageSet };

/** Blank strings mean "unset", so a cleared field falls back to the config default. */
function dropBlank(settings: Settings): Settings {
  const clean: Settings = {};
  if (settings.openaiApiKey) clean.openaiApiKey = settings.openaiApiKey;
  if (settings.openaiModel) clean.openaiModel = settings.openaiModel;
  if (settings.spreadsheetId) clean.spreadsheetId = settings.spreadsheetId;
  if (settings.sheetTab) clean.sheetTab = settings.sheetTab;
  return clean;
}

/** Stored data is never trusted: anything that fails validation reads as "no settings". */
export async function readSettings(adapter: StorageAdapter = chromeAdapter): Promise<Settings> {
  const parsed = settingsSchema.safeParse(await adapter.get(SETTINGS_KEY));
  return parsed.success ? dropBlank(parsed.data) : {};
}

/** Merges `patch` into the stored settings; a blank value clears that setting. */
export async function writeSettings(patch: Settings, adapter: StorageAdapter = chromeAdapter): Promise<Settings> {
  const current = await readSettings(adapter);
  const next = dropBlank(settingsSchema.parse({ ...current, ...patch }));
  await adapter.set(SETTINGS_KEY, next);
  return next;
}

/** The review form's in-progress state: strings exactly as shown in the form. */
export const draftSchema = z.object({
  /** Raw URL of the page the draft was made from. */
  url: z.string(),
  inputs: z.record(z.string(), z.string()),
  /** Keys of fields the AI could not find, for "not found" flags. */
  missing: z.array(z.string()),
  /** The values were loaded from a row already in the sheet. */
  existing: z.boolean().optional(),
});

export type StoredDraft = z.infer<typeof draftSchema>;

const sessionAdapter: StorageAdapter = { get: sessionGet, set: sessionSet };

/** A corrupt or missing draft reads as `null`; it is never trusted. */
export async function readDraft(adapter: StorageAdapter = sessionAdapter): Promise<StoredDraft | null> {
  const parsed = draftSchema.safeParse(await adapter.get(DRAFT_KEY));
  return parsed.success ? parsed.data : null;
}

export async function writeDraft(draft: StoredDraft, adapter: StorageAdapter = sessionAdapter): Promise<void> {
  await adapter.set(DRAFT_KEY, draft);
}

/** Writing `null` is "no draft"; `readDraft` rejects it. */
export async function clearDraft(adapter: StorageAdapter = sessionAdapter): Promise<void> {
  await adapter.set(DRAFT_KEY, null);
}

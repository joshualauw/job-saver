import { z } from "zod";

import { storageGet, storageSet } from "./chrome";

const SETTINGS_KEY = "settings";

const optionalText = z.string().trim().optional();

export const settingsSchema = z.object({
  openaiApiKey: optionalText,
  openaiModel: optionalText,
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

import type { Resolver } from "react-hook-form";

import { parseSpreadsheetId } from "@/lib/spreadsheet-id";
import type { Settings } from "@/lib/storage";

/** The settings form as typed: every field is a string. */
export interface SettingsInputs {
  apiKey: string;
  model: string;
  spreadsheet: string;
  tab: string;
}

export type SettingsValidation =
  | { readonly ok: true; readonly patch: Settings }
  | { readonly ok: false; readonly errors: Readonly<Partial<Record<keyof SettingsInputs, string>>> };

/**
 * Turns the form into a settings patch. The saved API key is never shown, so a blank key field
 * means "keep the saved key" and is left out of the patch; every other blank clears its setting
 * (model → config default, spreadsheet → none, tab → default tab).
 */
export function validateSettings(inputs: SettingsInputs): SettingsValidation {
  const spreadsheet = inputs.spreadsheet.trim();
  const spreadsheetId = spreadsheet === "" ? "" : parseSpreadsheetId(spreadsheet);
  if (spreadsheetId === null) {
    return { ok: false, errors: { spreadsheet: "Paste the spreadsheet URL or its ID." } };
  }

  const patch: Settings = {
    openaiModel: inputs.model.trim(),
    spreadsheetId,
    sheetTab: inputs.tab.trim(),
  };
  const apiKey = inputs.apiKey.trim();
  if (apiKey !== "") patch.openaiApiKey = apiKey;

  return { ok: true, patch };
}

export const settingsResolver: Resolver<SettingsInputs> = (inputs) => {
  const result = validateSettings(inputs);
  if (result.ok) return { values: inputs, errors: {} };

  return {
    values: {},
    errors: Object.fromEntries(
      Object.entries(result.errors).map(([key, message]) => [key, { type: "validate", message }]),
    ),
  };
};

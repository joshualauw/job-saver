import { describe, expect, it } from "vitest";

import { settingsResolver, validateSettings } from "./validate-settings";
import type { SettingsInputs } from "./validate-settings";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abc";
const base: SettingsInputs = { apiKey: "", model: "", spreadsheet: "", tab: "", preferences: "" };

describe("validateSettings", () => {
  it("leaves a blank API key out of the patch so the saved key is kept", () => {
    const result = validateSettings({ ...base, spreadsheet: ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect("openaiApiKey" in result.patch).toBe(false);
  });

  it("includes a typed API key, trimmed", () => {
    const result = validateSettings({ ...base, apiKey: "  sk-new  " });
    expect(result.ok && result.patch.openaiApiKey).toBe("sk-new");
  });

  it("extracts the spreadsheet ID from a pasted URL", () => {
    const url = `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`;
    const result = validateSettings({ ...base, spreadsheet: url });
    expect(result.ok && result.patch.spreadsheetId).toBe(ID);
  });

  it("rejects text that is neither a sheet URL nor an ID", () => {
    const result = validateSettings({ ...base, spreadsheet: "my jobs sheet" });
    expect(result).toEqual({ ok: false, errors: { spreadsheet: "Paste the spreadsheet URL or its ID." } });
  });

  it("clears model, spreadsheet and tab when blank, and trims them otherwise", () => {
    const cleared = validateSettings(base);
    expect(cleared.ok && cleared.patch).toEqual({ openaiModel: "", spreadsheetId: "", sheetTab: "", preferences: [] });

    const filled = validateSettings({ ...base, model: " my-model ", tab: " Applications " });
    expect(filled.ok && filled.patch).toMatchObject({ openaiModel: "my-model", sheetTab: "Applications" });
  });
});

describe("validateSettings preferences", () => {
  it("turns the lines into a list", () => {
    const result = validateSettings({ ...base, preferences: " Remote \n\nSalary above 10M " });
    expect(result.ok && result.patch.preferences).toEqual(["Remote", "Salary above 10M"]);
  });

  it("reports too many preferences on that field", () => {
    const many = Array.from({ length: 21 }, (_, index) => `pref ${index}`).join("\n");
    const result = validateSettings({ ...base, preferences: many });
    expect(result).toEqual({ ok: false, errors: { preferences: "Keep it to 20 preferences or fewer." } });
  });
});

describe("settingsResolver", () => {
  const run = (inputs: SettingsInputs) =>
    settingsResolver(inputs, undefined, { fields: {}, shouldUseNativeValidation: false });

  it("passes valid inputs through", async () => {
    const result = await run({ ...base, spreadsheet: ID });
    expect(result.errors).toEqual({});
  });

  it("reports an invalid spreadsheet on that field", async () => {
    const result = await run({ ...base, spreadsheet: "nope" });
    expect(result.errors["spreadsheet"]).toMatchObject({ message: "Paste the spreadsheet URL or its ID." });
  });
});

import { describe, expect, it } from "vitest";

import { clearDraft, readDraft, readSettings, writeDraft, writeSettings } from "./storage";
import type { StorageAdapter } from "./storage";

function memoryAdapter(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial));
  const adapter: StorageAdapter = {
    get: (key) => Promise.resolve(data.get(key)),
    set: (key, value) => {
      data.set(key, value);
      return Promise.resolve();
    },
  };
  return { adapter, data };
}

describe("settings storage", () => {
  it("reads empty settings when nothing is stored", async () => {
    expect(await readSettings(memoryAdapter().adapter)).toEqual({});
  });

  it("round-trips a saved key and model", async () => {
    const { adapter } = memoryAdapter();
    await writeSettings({ openaiApiKey: " sk-abc ", openaiModel: "m" }, adapter);
    expect(await readSettings(adapter)).toEqual({ openaiApiKey: "sk-abc", openaiModel: "m" });
  });

  it("merges a patch into the existing settings", async () => {
    const { adapter } = memoryAdapter();
    await writeSettings({ openaiApiKey: "sk-abc" }, adapter);
    await writeSettings({ openaiModel: "m" }, adapter);
    expect(await readSettings(adapter)).toEqual({ openaiApiKey: "sk-abc", openaiModel: "m" });
  });

  it("clears a setting when it is written blank", async () => {
    const { adapter, data } = memoryAdapter();
    await writeSettings({ openaiApiKey: "sk-abc", openaiModel: "m" }, adapter);
    await writeSettings({ openaiModel: "  " }, adapter);
    expect(await readSettings(adapter)).toEqual({ openaiApiKey: "sk-abc" });
    expect(data.get("settings")).toEqual({ openaiApiKey: "sk-abc" });
  });

  it.each([
    ["a string", "oops"],
    ["wrong field types", { openaiApiKey: 123 }],
    ["null", null],
  ])("treats %s in storage as no settings", async (_label, stored) => {
    const { adapter } = memoryAdapter({ settings: stored });
    expect(await readSettings(adapter)).toEqual({});
  });
});

describe("draft storage", () => {
  const draft = {
    url: "https://id.jobstreet.com/id/job/1",
    inputs: { company: "Ryvo", skills: "node.js" },
    missing: ["address"],
  };

  it("reads null when there is no draft", async () => {
    expect(await readDraft(memoryAdapter().adapter)).toBeNull();
  });

  it("round-trips a draft", async () => {
    const { adapter } = memoryAdapter();
    await writeDraft(draft, adapter);
    expect(await readDraft(adapter)).toEqual(draft);
  });

  it("clears a draft", async () => {
    const { adapter } = memoryAdapter();
    await writeDraft(draft, adapter);
    await clearDraft(adapter);
    expect(await readDraft(adapter)).toBeNull();
  });

  it.each([
    ["a string", "oops"],
    ["non-string inputs", { url: "u", inputs: { company: 1 }, missing: [] }],
    ["missing fields", { url: "u" }],
  ])("treats %s as no draft", async (_label, stored) => {
    const { adapter } = memoryAdapter({ draft: stored });
    expect(await readDraft(adapter)).toBeNull();
  });
});

describe("spreadsheet setting", () => {
  it("round-trips the spreadsheet ID alongside other settings", async () => {
    const { adapter } = memoryAdapter();
    await writeSettings({ openaiApiKey: "sk-abc" }, adapter);
    await writeSettings({ spreadsheetId: " sheet-123 " }, adapter);
    expect(await readSettings(adapter)).toEqual({ openaiApiKey: "sk-abc", spreadsheetId: "sheet-123" });
  });

  it("clears the spreadsheet when written blank", async () => {
    const { adapter } = memoryAdapter();
    await writeSettings({ spreadsheetId: "sheet-123" }, adapter);
    await writeSettings({ spreadsheetId: "" }, adapter);
    expect(await readSettings(adapter)).toEqual({});
  });
});

describe("sheet tab setting", () => {
  it("round-trips the tab and clears it when written blank", async () => {
    const { adapter } = memoryAdapter();
    await writeSettings({ sheetTab: " Applications " }, adapter);
    expect(await readSettings(adapter)).toEqual({ sheetTab: "Applications" });

    await writeSettings({ sheetTab: "" }, adapter);
    expect(await readSettings(adapter)).toEqual({});
  });
});

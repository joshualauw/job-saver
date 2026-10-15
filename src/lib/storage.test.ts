import { describe, expect, it } from "vitest";

import { readSettings, writeSettings } from "./storage";
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

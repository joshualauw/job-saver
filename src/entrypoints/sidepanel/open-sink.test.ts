import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import { UnexpectedError } from "@/core/errors";

import { openSink, sheetTabOf } from "./open-sink";
import type { SinkDeps } from "./open-sink";

function deps(settings: Awaited<ReturnType<SinkDeps["readSettings"]>>) {
  const sink = { save: vi.fn(), list: vi.fn(), verify: vi.fn() };
  const createSink = vi.fn().mockReturnValue(sink);
  return { all: { readSettings: () => Promise.resolve(settings), createSink } satisfies SinkDeps, createSink, sink };
}

describe("openSink", () => {
  it("fails with the given message, and never builds a sink, when no spreadsheet is saved", async () => {
    const { all, createSink } = deps({});
    await expect(openSink("Add a sheet first.", all)).rejects.toThrow(new UnexpectedError("Add a sheet first."));
    expect(createSink).not.toHaveBeenCalled();
  });

  it("opens the default tab when none is chosen", async () => {
    const { all, createSink, sink } = deps({ spreadsheetId: "sheet-id" });
    await expect(openSink("x", all)).resolves.toEqual({ sink, tab: appConfig.defaultSheetTab });
    expect(createSink).toHaveBeenCalledWith("sheet-id", appConfig.defaultSheetTab);
  });

  it("opens the tab chosen in Settings", async () => {
    const { all, createSink } = deps({ spreadsheetId: "sheet-id", sheetTab: "Applications" });
    await expect(openSink("x", all)).resolves.toMatchObject({ tab: "Applications" });
    expect(createSink).toHaveBeenCalledWith("sheet-id", "Applications");
  });
});

describe("sheetTabOf", () => {
  it("falls back to the default tab", () => {
    expect(sheetTabOf({})).toBe(appConfig.defaultSheetTab);
    expect(sheetTabOf({ sheetTab: "Applications" })).toBe("Applications");
  });
});

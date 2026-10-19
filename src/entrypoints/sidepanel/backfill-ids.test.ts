import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import { MissingColumnsError, UnexpectedError } from "@/core/errors";

import { backfillIds } from "./backfill-ids";
import type { BackfillDeps } from "./backfill-ids";

function deps(overrides: Partial<BackfillDeps> = {}) {
  const backfill = vi.fn().mockResolvedValue({ filled: 3 });
  const createSink = vi.fn().mockReturnValue({ backfillIds: backfill });
  const all: BackfillDeps = {
    readSettings: () => Promise.resolve({ spreadsheetId: "sheet-id" }),
    createSink,
    ...overrides,
  };
  return { all, backfill, createSink };
}

describe("backfillIds", () => {
  it("asks for a spreadsheet first and never builds a sink without one", async () => {
    const { all, createSink } = deps({ readSettings: () => Promise.resolve({}) });
    await expect(backfillIds(all)).rejects.toBeInstanceOf(UnexpectedError);
    expect(createSink).not.toHaveBeenCalled();
  });

  it("fills the default tab and reports how many rows got an ID", async () => {
    const { all, createSink, backfill } = deps();
    await expect(backfillIds(all)).resolves.toEqual({ filled: 3 });
    expect(createSink).toHaveBeenCalledWith("sheet-id", appConfig.defaultSheetTab);
    expect(backfill).toHaveBeenCalledOnce();
  });

  it("fills the tab chosen in settings", async () => {
    const { all, createSink } = deps({
      readSettings: () => Promise.resolve({ spreadsheetId: "sheet-id", sheetTab: "Applications" }),
    });
    await backfillIds(all);
    expect(createSink).toHaveBeenCalledWith("sheet-id", "Applications");
  });

  it("passes a missing-column failure through so the user sees which headers are absent", async () => {
    const { all, backfill } = deps();
    backfill.mockRejectedValue(new MissingColumnsError(["Job ID"]));
    await expect(backfillIds(all)).rejects.toThrow("Job ID");
  });
});

import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import { UnexpectedError } from "@/core/errors";

import { saveJob } from "./save-job";
import type { SaveDeps } from "./save-job";

const values = { company: "Ryvo", jobId: "abcdefghijkl", jobUrl: "https://id.jobstreet.com/id/job/1" };

function deps(overrides: Partial<SaveDeps> = {}) {
  const save = vi.fn().mockResolvedValue({ action: "created", row: 4 });
  const createSink = vi.fn().mockReturnValue({ save });
  const all: SaveDeps = {
    readSettings: () => Promise.resolve({ spreadsheetId: "sheet-id" }),
    createSink,
    ...overrides,
  };
  return { all, save, createSink };
}

describe("saveJob", () => {
  it("asks for a spreadsheet first and never builds a sink without one", async () => {
    const { all, createSink } = deps({ readSettings: () => Promise.resolve({}) });
    await expect(saveJob(values, all)).rejects.toBeInstanceOf(UnexpectedError);
    expect(createSink).not.toHaveBeenCalled();
  });

  it("saves through the sink and returns its result", async () => {
    const { all, save, createSink } = deps();
    await expect(saveJob(values, all)).resolves.toEqual({ action: "created", row: 4 });
    expect(createSink).toHaveBeenCalledWith("sheet-id", appConfig.defaultSheetTab);
    expect(save).toHaveBeenCalledWith(values);
  });
});

describe("saveJob tab", () => {
  it("saves into the tab chosen in settings", async () => {
    const { all, createSink } = deps({
      readSettings: () => Promise.resolve({ spreadsheetId: "sheet-id", sheetTab: "Applications" }),
    });
    await saveJob(values, all);
    expect(createSink).toHaveBeenCalledWith("sheet-id", "Applications");
  });
});

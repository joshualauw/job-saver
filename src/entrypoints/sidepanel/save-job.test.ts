import { describe, expect, it, vi } from "vitest";

import { UnexpectedError } from "@/core/errors";

import { saveJob } from "./save-job";
import type { SaveDeps } from "./save-job";

const values = { company: "Ryvo", jobUrl: "https://id.jobstreet.com/id/job/1" };

function deps(overrides: Partial<SaveDeps> = {}) {
  const save = vi.fn().mockResolvedValue({ action: "created", row: 4 });
  const createSink = vi.fn().mockReturnValue({ find: vi.fn(), save });
  const all: SaveDeps = {
    readSettings: () => Promise.resolve({ spreadsheetId: "sheet-id" }),
    createSink,
    today: () => "2026-10-16",
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

  it("saves through the sink with today's date and returns its result", async () => {
    const { all, save, createSink } = deps();
    await expect(saveJob(values, all)).resolves.toEqual({ action: "created", row: 4 });
    expect(createSink).toHaveBeenCalledWith("sheet-id");
    expect(save).toHaveBeenCalledWith(values, "2026-10-16");
  });
});

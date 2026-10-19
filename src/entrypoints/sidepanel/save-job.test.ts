import { describe, expect, it, vi } from "vitest";

import { UnexpectedError } from "@/core/errors";

import type { SinkDeps } from "./open-sink";
import { saveJob } from "./save-job";

const values = { company: "Ryvo", jobId: "abcdefghijkl", sourceUrl: "https://id.jobstreet.com/id/job/1" };

function deps(settings: Awaited<ReturnType<SinkDeps["readSettings"]>> = { spreadsheetId: "sheet-id" }) {
  const save = vi.fn().mockResolvedValue({ action: "created", row: 4 });
  const createSink = vi.fn().mockReturnValue({ save });
  return { all: { readSettings: () => Promise.resolve(settings), createSink } satisfies SinkDeps, save, createSink };
}

describe("saveJob", () => {
  it("asks for a spreadsheet first and never builds a sink without one", async () => {
    const { all, createSink } = deps({});
    await expect(saveJob(values, all)).rejects.toBeInstanceOf(UnexpectedError);
    expect(createSink).not.toHaveBeenCalled();
  });

  it("saves the values through the sink and returns its result", async () => {
    const { all, save } = deps();
    await expect(saveJob(values, all)).resolves.toEqual({ action: "created", row: 4 });
    expect(save).toHaveBeenCalledWith(values);
  });
});

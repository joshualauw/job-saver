import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import { MissingColumnsError, UnexpectedError } from "@/core/errors";

import type { SinkDeps } from "./open-sink";
import { verifyConnection } from "./verify-connection";

function deps(settings: Awaited<ReturnType<SinkDeps["readSettings"]>> = { spreadsheetId: "sheet-id" }) {
  const verify = vi.fn().mockResolvedValue({ columns: 18 });
  const createSink = vi.fn().mockReturnValue({ verify });
  return { all: { readSettings: () => Promise.resolve(settings), createSink } satisfies SinkDeps, verify, createSink };
}

describe("verifyConnection", () => {
  it("asks for a spreadsheet first and never builds a sink without one", async () => {
    const { all, createSink } = deps({});
    await expect(verifyConnection(all)).rejects.toBeInstanceOf(UnexpectedError);
    expect(createSink).not.toHaveBeenCalled();
  });

  it("verifies the saved tab and reports it with how many columns were found", async () => {
    const { all, verify } = deps();
    await expect(verifyConnection(all)).resolves.toEqual({ tab: appConfig.defaultSheetTab, columns: 18 });
    expect(verify).toHaveBeenCalledOnce();
  });

  it("passes a missing-column failure through so the user sees which headers are absent", async () => {
    const { all, verify } = deps();
    verify.mockRejectedValue(new MissingColumnsError(["Notes", "Skills"]));
    await expect(verifyConnection(all)).rejects.toThrow("Notes, Skills");
  });
});

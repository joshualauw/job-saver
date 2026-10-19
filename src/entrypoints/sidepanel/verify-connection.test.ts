import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import { MissingColumnsError, UnexpectedError } from "@/core/errors";

import { verifyConnection } from "./verify-connection";
import type { VerifyDeps } from "./verify-connection";

function deps(overrides: Partial<VerifyDeps> = {}) {
  const verify = vi.fn().mockResolvedValue({ columns: 18 });
  const createSink = vi.fn().mockReturnValue({ save: vi.fn(), verify });
  const all: VerifyDeps = {
    readSettings: () => Promise.resolve({ spreadsheetId: "sheet-id" }),
    createSink,
    ...overrides,
  };
  return { all, verify, createSink };
}

describe("verifyConnection", () => {
  it("asks for a spreadsheet first and never builds a sink without one", async () => {
    const { all, createSink } = deps({ readSettings: () => Promise.resolve({}) });
    await expect(verifyConnection(all)).rejects.toBeInstanceOf(UnexpectedError);
    expect(createSink).not.toHaveBeenCalled();
  });

  it("verifies the default tab and reports how many columns were found", async () => {
    const { all, createSink, verify } = deps();
    await expect(verifyConnection(all)).resolves.toEqual({ tab: appConfig.defaultSheetTab, columns: 18 });
    expect(createSink).toHaveBeenCalledWith("sheet-id", appConfig.defaultSheetTab);
    expect(verify).toHaveBeenCalledOnce();
  });

  it("verifies the tab chosen in settings", async () => {
    const { all, createSink } = deps({
      readSettings: () => Promise.resolve({ spreadsheetId: "sheet-id", sheetTab: "Applications" }),
    });
    await expect(verifyConnection(all)).resolves.toMatchObject({ tab: "Applications" });
    expect(createSink).toHaveBeenCalledWith("sheet-id", "Applications");
  });

  it("passes a missing-column failure through so the user sees which headers are absent", async () => {
    const { all, verify } = deps();
    verify.mockRejectedValue(new MissingColumnsError(["Notes", "Skills"]));
    await expect(verifyConnection(all)).rejects.toThrow("Notes, Skills");
  });
});

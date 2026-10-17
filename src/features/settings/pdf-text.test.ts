import { describe, expect, it } from "vitest";

import { CvFileError } from "@/core/errors";

import { makePdf } from "../../../tests/helpers/make-pdf";

import { readPdfText } from "./pdf-text";

describe("readPdfText", () => {
  it("returns the text of the page", async () => {
    const text = await readPdfText(makePdf(["Backend engineer (Node.js)", "Five years at Acme"]));
    expect(text).toContain("Backend engineer (Node.js)");
    expect(text).toContain("Five years at Acme");
  });

  it("returns no text for a page without a text layer", async () => {
    expect((await readPdfText(makePdf([]))).trim()).toBe("");
  });

  it("rejects bytes that are not a PDF", async () => {
    await expect(readPdfText(new TextEncoder().encode("definitely not a pdf"))).rejects.toBeInstanceOf(CvFileError);
  });
});

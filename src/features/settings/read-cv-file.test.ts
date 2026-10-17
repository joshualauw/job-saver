import { describe, expect, it, vi } from "vitest";

import { appConfig } from "@/config/app";
import { CvFileError } from "@/core/errors";

import { readCvFile } from "./read-cv-file";

const file = (name: string, content: string) => new File([content], name);
const noPdf = () => Promise.reject(new Error("pdf reader should not run"));

describe("readCvFile", () => {
  it.each(["cv.txt", "CV.MD"])("reads and cleans a plain text file (%s)", async (name) => {
    const result = await readCvFile(file(name, "  Jane Doe \n\n\n\n Backend   dev \n"), noPdf);
    expect(result).toEqual({ fileName: name, text: "Jane Doe\n\nBackend dev" });
  });

  it("sends a PDF through the PDF reader and cleans its text", async () => {
    const readPdf = vi.fn().mockResolvedValue("Jane Doe  \n\n\n\nEngineer");
    const result = await readCvFile(file("cv.pdf", "%PDF-1.7 ..."), readPdf);
    expect(readPdf).toHaveBeenCalledOnce();
    expect(result).toEqual({ fileName: "cv.pdf", text: "Jane Doe\n\nEngineer" });
  });

  it("refuses an unsupported file type", async () => {
    await expect(readCvFile(file("cv.docx", "x"), noPdf)).rejects.toBeInstanceOf(CvFileError);
  });

  it("refuses a .pdf that is not a PDF", async () => {
    await expect(readCvFile(file("cv.pdf", "just text"), noPdf)).rejects.toThrow("doesn't look like a PDF");
  });

  it("refuses a file that is too large before reading it", async () => {
    const big = new File([new Uint8Array(appConfig.maxCvFileBytes + 1)], "cv.txt");
    await expect(readCvFile(big, noPdf)).rejects.toThrow("larger than");
  });

  it("refuses a file with no readable text, such as a scanned PDF", async () => {
    await expect(readCvFile(file("cv.pdf", "%PDF-1.4"), () => Promise.resolve(" \n "))).rejects.toThrow(
      "No readable text",
    );
    await expect(readCvFile(file("cv.txt", "   "), noPdf)).rejects.toThrow("No readable text");
  });

  it("refuses text over the limit without quoting it", async () => {
    const secret = "PRIVATE-".repeat(appConfig.maxCvChars);
    const error = await readCvFile(file("cv.txt", secret), noPdf).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(CvFileError);
    expect((error as CvFileError).message).toContain("6,000");
    expect((error as CvFileError).message).not.toContain("PRIVATE");
  });

  it("accepts text exactly at the limit", async () => {
    const result = await readCvFile(file("cv.txt", "a".repeat(appConfig.maxCvChars)), noPdf);
    expect(result.text).toHaveLength(appConfig.maxCvChars);
  });
});

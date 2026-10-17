import { appConfig } from "@/config/app";
import { CvFileError } from "@/core/errors";
import { normalizeText } from "@/core/normalize";

import { readPdfText } from "./pdf-text";

export interface CvFile {
  readonly fileName: string;
  /** Cleaned plain text, within the length limit. */
  readonly text: string;
}

const PDF_MAGIC = "%PDF-";

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/** A PDF may have a few bytes of junk before the header, so look at the start rather than byte 0. */
function looksLikePdf(bytes: Uint8Array): boolean {
  return new TextDecoder("latin1").decode(bytes.subarray(0, 1024)).includes(PDF_MAGIC);
}

/**
 * Reads a CV file (PDF, .txt or .md) into cleaned plain text. Nothing is parsed or structured, and
 * nothing is cut: a CV that does not fit is refused. Errors never quote the file's contents.
 */
export async function readCvFile(
  file: File,
  readPdf: (bytes: Uint8Array) => Promise<string> = readPdfText,
): Promise<CvFile> {
  const extension = extensionOf(file.name);
  if (extension !== ".pdf" && extension !== ".txt" && extension !== ".md") {
    throw new CvFileError("Choose a PDF, .txt or .md file.");
  }
  if (file.size > appConfig.maxCvFileBytes) {
    throw new CvFileError(`This file is larger than ${appConfig.maxCvFileBytes / (1024 * 1024)} MB.`);
  }

  let raw: string;
  if (extension === ".pdf") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLikePdf(bytes)) throw new CvFileError("This doesn't look like a PDF file.");
    raw = await readPdf(bytes);
  } else {
    raw = await file.text();
  }

  const text = normalizeText(raw);
  if (text === "") {
    throw new CvFileError("No readable text found. A scanned PDF has none; export a text version instead.");
  }
  if (text.length > appConfig.maxCvChars) {
    throw new CvFileError(
      `This CV is longer than ${appConfig.maxCvChars.toLocaleString("en-US")} characters. Shorten it and try again.`,
    );
  }
  return { fileName: file.name.trim(), text };
}

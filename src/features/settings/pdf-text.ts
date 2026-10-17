import { CvFileError } from "@/core/errors";

/** Stop reading pages once this much text has been collected; the caller rejects it as too long anyway. */
const STOP_AFTER_CHARS = 20_000;

/**
 * Raw text of a PDF, pages in order. The only module that knows pdf.js, which is loaded on first
 * use so the panel does not pay for it until a PDF is chosen. Throws a `CvFileError` for a file
 * that cannot be read (encrypted or damaged); a PDF without a text layer returns `""`.
 */
export async function readPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // In the browser the worker is a bundled file. In Node (tests) pdf.js finds its own.
  if (typeof document !== "undefined") {
    const { default: workerUrl } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }

  const task = pdfjs.getDocument({ data: bytes });
  try {
    const pdf = await task.promise;
    let text = "";
    for (let number = 1; number <= pdf.numPages && text.length < STOP_AFTER_CHARS; number += 1) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str + (item.hasEOL ? "\n" : " ");
      }
      text += "\n\n";
    }
    return text;
  } catch (cause) {
    if (cause instanceof Error && cause.name === "PasswordException") {
      throw new CvFileError("This PDF is password protected. Remove the password and try again.", { cause });
    }
    throw new CvFileError("Couldn't read this PDF. Try exporting it again, or use a .txt file.", { cause });
  } finally {
    await task.destroy();
  }
}

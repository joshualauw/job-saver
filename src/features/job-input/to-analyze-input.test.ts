import { describe, expect, it } from "vitest";

import type { ImageItem, PickedFile } from "./read-attachment";
import { analyzeLabel, toAnalyzeInput } from "./to-analyze-input";
import type { TabContents } from "./to-analyze-input";

const image = (id: string): ImageItem => ({ id, name: `${id}.png`, mimeType: "image/png", dataUrl: "data:image/png;base64,AA" });
const textFile: PickedFile = { kind: "text", name: "ad.txt", size: 12, text: "Build things." };
const pdfFile: PickedFile = {
  kind: "media",
  name: "ad.pdf",
  size: 99,
  item: { name: "ad.pdf", mimeType: "application/pdf", dataUrl: "data:application/pdf;base64,AA" },
};

const empty: TabContents = { text: "", images: [], file: null };
const full: TabContents = { text: "  Senior   dev  ", images: [image("a"), image("b")], file: textFile };

describe("toAnalyzeInput", () => {
  it("only ever uses the active tab, even when the others have content", () => {
    expect(toAnalyzeInput("text", full)).toEqual({ kind: "text", text: "  Senior   dev  " });
    expect(toAnalyzeInput("image", full)).toEqual({ kind: "media", items: full.images });
    expect(toAnalyzeInput("file", full)).toEqual({ kind: "text", text: "Build things." });
  });

  it("is null for an empty active tab, whatever the other tabs hold", () => {
    expect(toAnalyzeInput("text", { ...full, text: "  \n " })).toBeNull();
    expect(toAnalyzeInput("image", { ...full, images: [] })).toBeNull();
    expect(toAnalyzeInput("file", { ...full, file: null })).toBeNull();
    expect(toAnalyzeInput("text", empty)).toBeNull();
  });

  it("sends a PDF as media and a text file as text", () => {
    expect(toAnalyzeInput("file", { ...empty, file: pdfFile })).toEqual({ kind: "media", items: [pdfFile.item] });
    expect(toAnalyzeInput("file", { ...empty, file: textFile })).toEqual({ kind: "text", text: "Build things." });
  });
});

describe("analyzeLabel", () => {
  it("stays plain when the active tab is empty", () => {
    for (const tab of ["text", "image", "file"] as const) expect(analyzeLabel(tab, empty)).toBe("Analyze");
  });

  it("describes the active tab's content", () => {
    expect(analyzeLabel("text", { ...empty, text: "a".repeat(1234) })).toBe("Analyze 1,234 characters");
    expect(analyzeLabel("text", full)).toBe("Analyze 10 characters");
    expect(analyzeLabel("image", full)).toBe("Analyze 2 images");
    expect(analyzeLabel("image", { ...empty, images: [image("a")] })).toBe("Analyze 1 image");
    expect(analyzeLabel("file", full)).toBe("Analyze ad.txt");
  });
});

import type { AnalyzeInput } from "@/core/types";

import { textLength } from "./job-text";
import type { ImageItem, PickedFile } from "./read-attachment";

export type InputTab = "text" | "image" | "file";

/** What each tab is holding right now. Only the active tab is analyzed. */
export interface TabContents {
  readonly text: string;
  readonly images: readonly ImageItem[];
  readonly file: PickedFile | null;
}

/** The active tab's content as something to analyze; `null` when that tab is empty. */
export function toAnalyzeInput(tab: InputTab, contents: TabContents): AnalyzeInput | null {
  switch (tab) {
    case "text":
      return textLength(contents.text) > 0 ? { kind: "text", text: contents.text } : null;
    case "image":
      return contents.images.length > 0 ? { kind: "media", items: contents.images } : null;
    case "file": {
      const file = contents.file;
      if (file === null) return null;
      return file.kind === "text" ? { kind: "text", text: file.text } : { kind: "media", items: [file.item] };
    }
  }
}

/** Analyze button text for the active tab. */
export function analyzeLabel(tab: InputTab, contents: TabContents): string {
  switch (tab) {
    case "text": {
      const length = textLength(contents.text);
      return length === 0 ? "Analyze" : `Analyze ${length.toLocaleString("en-US")} characters`;
    }
    case "image": {
      const count = contents.images.length;
      return count === 0 ? "Analyze" : `Analyze ${count} ${count === 1 ? "image" : "images"}`;
    }
    case "file":
      return contents.file === null ? "Analyze" : `Analyze ${contents.file.name}`;
  }
}

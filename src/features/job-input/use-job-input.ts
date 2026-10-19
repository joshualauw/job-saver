import { useCallback, useState } from "react";

import type { AnalyzeInput } from "@/core/types";

import type { ImageItem, PickedFile } from "./read-attachment";
import { analyzeLabel, inputSummary, toAnalyzeInput } from "./to-analyze-input";
import type { InputTab } from "./to-analyze-input";
import { useTextInput } from "./use-text-input";

/**
 * Everything the three input tabs hold. Each tab keeps its content while another is shown (images and
 * the file live in memory, so they are lost when the panel closes); only the active tab is analyzed.
 * `hasForm` says a form is already showing, which turns Analyze into Re-Analyze.
 */
export function useJobInput(hasForm: boolean) {
  const [tab, setTab] = useState<InputTab>("text");
  const [images, setImages] = useState<readonly ImageItem[]>([]);
  const [file, setFile] = useState<PickedFile | null>(null);
  const showText = useCallback(() => setTab("text"), []);
  const text = useTextInput(showText);

  const contents = { text: text.text, images, file };
  const analyzeInput: AnalyzeInput | null = toAnalyzeInput(tab, contents);

  const addImages = useCallback((items: readonly ImageItem[]) => setImages((current) => [...current, ...items]), []);
  const removeImage = useCallback((id: string) => setImages((current) => current.filter((item) => item.id !== id)), []);

  /** Empties the active tab only, once its content has been saved. */
  const clearActive = () => {
    if (tab === "text") text.clear();
    else if (tab === "image") setImages([]);
    else setFile(null);
  };

  return {
    tab,
    setTab,
    text: text.text,
    setText: text.change,
    clearText: text.clear,
    images,
    addImages,
    removeImage,
    file,
    setFile,
    analyzeInput,
    analyzeLabel: analyzeLabel(tab, contents, hasForm),
    summary: inputSummary(tab, contents),
    clearActive,
  };
}

export type JobInputState = ReturnType<typeof useJobInput>;

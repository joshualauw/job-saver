import { Button, Tabs } from "@chakra-ui/react";
import { Stack } from "@chakra-ui/react";

import { FileIcon } from "./icons/FileIcon";
import { ImageIcon } from "./icons/ImageIcon";
import { TextIcon } from "./icons/TextIcon";
import { FileTab } from "./FileTab";
import { ImageTab } from "./ImageTab";
import { TextTab } from "./TextTab";
import type { InputTab } from "./to-analyze-input";
import type { JobInputState } from "./use-job-input";

interface Props {
  input: JobInputState;
  onAnalyze: () => void;
  analyzing: boolean;
  /** Analyzing is not possible yet for a reason outside the tabs (no API key). */
  blocked: boolean;
}

/** Three ways to give the panel a job posting. Only the tab being shown is analyzed. */
export function JobInput({ input, onAnalyze, analyzing, blocked }: Props) {
  return (
    <Stack gap="3">
      <Tabs.Root
        value={input.tab}
        onValueChange={(details) => input.setTab(details.value as InputTab)}
        fitted
        size="sm"
      >
        <Tabs.List>
          <Tabs.Trigger value="text">
            <TextIcon />
            Text
          </Tabs.Trigger>
          <Tabs.Trigger value="image">
            <ImageIcon />
            Image
          </Tabs.Trigger>
          <Tabs.Trigger value="file">
            <FileIcon />
            File
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="text">
          <TextTab text={input.text} onChange={input.setText} onClear={input.clearText} />
        </Tabs.Content>
        <Tabs.Content value="image">
          <ImageTab
            images={input.images}
            active={input.tab === "image"}
            onAdd={input.addImages}
            onRemove={input.removeImage}
          />
        </Tabs.Content>
        <Tabs.Content value="file">
          <FileTab file={input.file} onChange={input.setFile} />
        </Tabs.Content>
      </Tabs.Root>

      <Button
        onClick={onAnalyze}
        loading={analyzing}
        loadingText="Asking AI"
        disabled={blocked || input.analyzeInput === null}
      >
        {input.analyzeLabel}
      </Button>
    </Stack>
  );
}

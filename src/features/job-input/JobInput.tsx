import { Accordion, Button, Stack, Tabs, Text } from "@chakra-ui/react";
import { useState } from "react";

import { FileIcon } from "./icons/FileIcon";
import { ImageIcon } from "./icons/ImageIcon";
import { TextIcon } from "./icons/TextIcon";
import { FileTab } from "./FileTab";
import { ImageTab } from "./ImageTab";
import { TextTab } from "./TextTab";
import type { InputTab } from "./to-analyze-input";
import type { JobInputState } from "./use-job-input";

const ITEM = "input";

interface Props {
  input: JobInputState;
  /** A form is showing, so the input folds away to leave room for it. */
  hasForm: boolean;
  onAnalyze: () => void;
  analyzing: boolean;
  /** Analyzing is not possible yet for a reason outside the tabs (no API key). */
  blocked: boolean;
}

/** Three ways to give the panel a job posting. Only the tab being shown is analyzed. */
export function JobInput({ input, hasForm, onAnalyze, analyzing, blocked }: Props) {
  // Open while there is no form, folded when one appears or goes away; the user can still toggle it.
  const [open, setOpen] = useState(!hasForm);
  const [lastHasForm, setLastHasForm] = useState(hasForm);
  if (lastHasForm !== hasForm) {
    setLastHasForm(hasForm);
    setOpen(!hasForm);
  }

  return (
    <Stack gap="3">
      {/* The content stays mounted when folded, so nothing typed or added is lost. */}
      <Accordion.Root
        collapsible
        variant="outline"
        value={open ? [ITEM] : []}
        onValueChange={(details) => setOpen(details.value.includes(ITEM))}
      >
        <Accordion.Item value={ITEM}>
          {hasForm && (
            <Accordion.ItemTrigger>
              <Text flex="1" truncate>
                {input.summary}
              </Text>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
          )}
          <Accordion.ItemContent>
            <Accordion.ItemBody>
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
            </Accordion.ItemBody>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>

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

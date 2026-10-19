import { Box, Button, Collapsible, HStack, Text } from "@chakra-ui/react";

import { selectionLength } from "./build-payload";

const PREVIEW_CHARS = 1200;

interface Props {
  /** The text sent from the right-click menu, if any. */
  text: string | null;
  onClear: () => void;
}

/** What will be analyzed: the highlighted text, or how to send some. */
export function CapturedSelection({ text, onClear }: Props) {
  if (text === null) {
    return (
      <Text color="fg.muted">
        Highlight a job posting on any page, right-click and choose <b>Send to Job Saver</b>.
      </Text>
    );
  }

  const length = selectionLength(text);
  return (
    <Collapsible.Root>
      <HStack justify="space-between">
        <Collapsible.Trigger asChild>
          <Button type="button" variant="ghost" size="sm">
            Selected text ({length.toLocaleString("en-US")} characters)
          </Button>
        </Collapsible.Trigger>
        <Button type="button" variant="ghost" size="xs" onClick={onClear}>
          Clear
        </Button>
      </HStack>
      <Collapsible.Content>
        <Box pt="2">
          <Text
            whiteSpace="pre-wrap"
            fontSize="xs"
            color="fg.muted"
            p="3"
            bg="bg.subtle"
            borderWidth="1px"
            rounded="md"
            maxH="64"
            overflowY="auto"
          >
            {text.slice(0, PREVIEW_CHARS)}
            {text.length > PREVIEW_CHARS ? "…" : ""}
          </Text>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

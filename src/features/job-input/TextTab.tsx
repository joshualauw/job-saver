import { Button, Field, HStack, Text, Textarea } from "@chakra-ui/react";

import { appConfig } from "@/config/app";

import { selectionLength } from "./build-payload";

interface Props {
  text: string;
  onChange: (text: string) => void;
  onClear: () => void;
}

export function TextTab({ text, onChange, onClear }: Props) {
  const length = selectionLength(text);
  const over = length > appConfig.maxPageTextChars;

  return (
    <Field.Root>
      <Field.Label>Job text</Field.Label>
      <Textarea
        size="sm"
        rows={9}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste or type the job posting. Or highlight it on any page, right-click and choose Send to Job Saver."
      />
      <HStack justify="space-between" w="full">
        <Text fontSize="xs" color={over ? "fg.warning" : "fg.muted"}>
          {over
            ? `${length.toLocaleString("en-US")} characters. Only the first ${appConfig.maxPageTextChars.toLocaleString("en-US")} are sent.`
            : `${length.toLocaleString("en-US")} characters`}
        </Text>
        <Button type="button" size="xs" variant="ghost" onClick={onClear} disabled={text === ""}>
          Clear
        </Button>
      </HStack>
    </Field.Root>
  );
}

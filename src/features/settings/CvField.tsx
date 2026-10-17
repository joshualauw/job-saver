import { Box, Button, Collapsible, Field, HStack, Text } from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import type { ChangeEvent } from "react";

import { appConfig } from "@/config/app";
import { AppError } from "@/core/errors";

import { readCvFile } from "./read-cv-file";
import type { CvFile } from "./read-cv-file";

interface Props {
  /** The saved CV, if any. */
  fileName: string | undefined;
  text: string | undefined;
  /** Called with a CV that was read and passed every check. */
  onLoaded: (cv: CvFile) => void;
  onRemove: () => void;
}

export function CvField({ fileName, text, onLoaded, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const read = useMutation({ mutationFn: (file: File) => readCvFile(file), onSuccess: onLoaded });

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    event.target.value = "";
    if (file) read.mutate(file);
  };

  const error = read.error instanceof AppError ? read.error.message : read.isError ? "Couldn't read this file." : null;

  return (
    <Field.Root invalid={error !== null}>
      <Field.Label>CV (optional)</Field.Label>
      <input ref={input} type="file" accept=".pdf,.txt,.md" hidden onChange={pick} />

      {text ? (
        <Box width="full">
          <Text>
            {fileName || "CV"} · {text.length.toLocaleString("en-US")} characters
          </Text>
          <HStack mt="1">
            <Button
              type="button"
              size="xs"
              variant="outline"
              loading={read.isPending}
              onClick={() => input.current?.click()}
            >
              Replace
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={onRemove}>
              Remove
            </Button>
          </HStack>
          <Collapsible.Root>
            <Collapsible.Trigger asChild>
              <Button type="button" size="xs" variant="ghost" mt="1">
                Show text
              </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box mt="1" maxHeight="48" overflowY="auto" whiteSpace="pre-wrap" fontSize="xs" color="fg.muted">
                {text}
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        </Box>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          alignSelf="flex-start"
          loading={read.isPending}
          onClick={() => input.current?.click()}
        >
          Choose CV file
        </Button>
      )}

      {error && <Field.ErrorText>{error}</Field.ErrorText>}
      <Field.HelperText>
        PDF, .txt or .md, up to {appConfig.maxCvChars.toLocaleString("en-US")} characters. Stored only in this browser.
      </Field.HelperText>
    </Field.Root>
  );
}

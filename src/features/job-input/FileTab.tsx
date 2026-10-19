import { Alert, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";

import { DropZone } from "./DropZone";
import { FILE_ACCEPT, readJobFile } from "./read-attachment";
import type { PickedFile } from "./read-attachment";

interface Props {
  file: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileTab({ file, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  const take = async (files: readonly File[]) => {
    const [first] = files;
    if (!first) return;
    const result = await readJobFile(first);
    setError(result.ok ? null : result.message);
    if (result.ok) onChange(result.value);
  };

  return (
    <Stack gap="3">
      <DropZone
        accept={FILE_ACCEPT}
        multiple={false}
        title="Add a file"
        hint="PDF, .txt or .md. Click or drop one file."
        onFiles={(files) => void take(files)}
      />

      {error && (
        <Alert.Root status="warning" size="sm">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {file && (
        <HStack justify="space-between" borderWidth="1px" rounded="md" px="3" py="2">
          <Text truncate>
            {file.name} <Text as="span" color="fg.muted">({formatSize(file.size)})</Text>
          </Text>
          <Button type="button" size="xs" variant="ghost" aria-label={`Remove ${file.name}`} onClick={() => onChange(null)}>
            Remove
          </Button>
        </HStack>
      )}

      <Text fontSize="xs" color="fg.muted">
        PDFs are sent to OpenAI to read, not stored. Forgotten when you close the panel.
      </Text>
    </Stack>
  );
}

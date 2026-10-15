import { Button, Field, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";

import { useSettings } from "./use-settings";

/** Minimal key entry for step 4; the full Settings view arrives in step 7. */
export function ApiKeyField() {
  const { settings, isLoading, save } = useSettings();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  if (isLoading) return null;

  const hasKey = Boolean(settings?.openaiApiKey);
  if (hasKey && !editing) {
    return (
      <HStack justify="space-between">
        <Text color="fg.muted">OpenAI API key saved</Text>
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          Change
        </Button>
      </HStack>
    );
  }

  const submit = () => {
    save.mutate(
      { openaiApiKey: draft },
      {
        onSuccess: () => {
          setDraft("");
          setEditing(false);
        },
      },
    );
  };

  return (
    <Stack gap="2">
      <Field.Root>
        <Field.Label>OpenAI API key</Field.Label>
        {/* Never rendered back: the saved key is not shown, only replaced. */}
        <Input
          type="password"
          autoComplete="off"
          placeholder="sk-..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Field.HelperText>Stored only in this browser (chrome.storage.local).</Field.HelperText>
      </Field.Root>
      <HStack>
        <Button size="sm" onClick={submit} disabled={draft.trim() === ""} loading={save.isPending}>
          Save key
        </Button>
        {hasKey && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </HStack>
    </Stack>
  );
}

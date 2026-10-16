import { Button, Field, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";

import { parseSpreadsheetId } from "@/features/sheet-sync/spreadsheet-id";

import { useSettings } from "./use-settings";

/** Minimal spreadsheet entry for step 6; the full Settings view arrives in step 7. */
export function SpreadsheetField() {
  const { settings, isLoading, save } = useSettings();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [invalid, setInvalid] = useState(false);

  if (isLoading) return null;

  const current = settings?.spreadsheetId;
  if (current && !editing) {
    return (
      <HStack justify="space-between">
        <Text color="fg.muted" truncate>
          Spreadsheet: {current}
        </Text>
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          Change
        </Button>
      </HStack>
    );
  }

  const submit = () => {
    const id = parseSpreadsheetId(draft);
    setInvalid(id === null);
    if (id === null) return;
    save.mutate(
      { spreadsheetId: id },
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
      <Field.Root invalid={invalid}>
        <Field.Label>Google spreadsheet</Field.Label>
        <Input
          autoComplete="off"
          placeholder="Spreadsheet URL or ID"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Field.HelperText>The sheet needs a "Jobs" tab with the column headers in row 1.</Field.HelperText>
        <Field.ErrorText>Paste the spreadsheet URL or its ID.</Field.ErrorText>
      </Field.Root>
      <HStack>
        <Button size="sm" onClick={submit} disabled={draft.trim() === ""} loading={save.isPending}>
          Save spreadsheet
        </Button>
        {current && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </HStack>
    </Stack>
  );
}

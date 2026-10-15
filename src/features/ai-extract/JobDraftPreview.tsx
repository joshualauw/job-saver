import { Badge, Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";

import { fields } from "@/config/fields";
import type { JobFieldKey } from "@/config/fields";

import type { JobDraft } from "./draft";

interface Props {
  values: JobDraft;
  missing: readonly JobFieldKey[];
}

function formatValue(field: (typeof fields)[number], value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : null;
  if (field.type === "enum" && "options" in field) {
    return field.options.find((option) => option.value === value)?.label ?? String(value);
  }
  return String(value);
}

/** Temporary read-only view of the proposed values; replaced by the editable form in step 5. */
export function JobDraftPreview({ values, missing }: Props) {
  return (
    <Box>
      <Heading size="sm" mb="2">
        Proposed values
      </Heading>
      <Stack gap="2">
        {fields.map((field) => {
          const text = formatValue(field, values[field.key]);
          const notFound = text === null && missing.includes(field.key);
          return (
            <Box key={field.key}>
              <Text fontSize="xs" color="fg.muted">
                {field.label}
              </Text>
              {text !== null ? (
                <Text whiteSpace="pre-wrap">{text}</Text>
              ) : (
                <HStack>
                  <Text color="fg.muted">—</Text>
                  {notFound && (
                    <Badge colorPalette="orange" size="xs">
                      Not found
                    </Badge>
                  )}
                </HStack>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

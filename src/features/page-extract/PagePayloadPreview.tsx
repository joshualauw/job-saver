import { Badge, Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";

import { platforms } from "@/config/platforms";
import { resolveJobSource } from "@/core/job-source";
import type { PagePayload } from "@/core/page-payload";

const DESCRIPTION_PREVIEW_CHARS = 1200;

const SOURCE_LABELS: Record<PagePayload["contentSource"], string> = {
  selection: "Your selected text",
  platform: "Platform selectors",
  generic: "Generic page text",
};

interface Props {
  payload: PagePayload;
}

/** Temporary view of what was read from the page; replaced by the editable form in step 5. */
export function PagePayloadPreview({ payload }: Props) {
  const source = resolveJobSource(payload.url, platforms);
  const facts = Object.entries(payload.facts);

  return (
    <Stack gap="4">
      <HStack gap="2" wrap="wrap">
        <Badge colorPalette={payload.contentSource === "generic" ? "orange" : "green"}>
          {SOURCE_LABELS[payload.contentSource]}
        </Badge>
        {source && <Badge>{source.platform}</Badge>}
        {payload.jsonLd.length > 0 && <Badge colorPalette="blue">JobPosting JSON-LD</Badge>}
      </HStack>

      {source && (
        <Text fontSize="xs" color="fg.muted" wordBreak="break-all">
          {source.jobUrl}
        </Text>
      )}

      <Box>
        <Heading size="sm" mb="2">
          Facts
        </Heading>
        {facts.length === 0 ? (
          <Text color="fg.muted">No structured facts found on this page.</Text>
        ) : (
          <Stack gap="1">
            {facts.map(([label, value]) => (
              <Text key={label}>
                <Text as="span" fontWeight="medium">
                  {label}:
                </Text>{" "}
                {value}
              </Text>
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Heading size="sm" mb="2">
          Description ({payload.description.length} chars)
        </Heading>
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
          {payload.description.slice(0, DESCRIPTION_PREVIEW_CHARS)}
          {payload.description.length > DESCRIPTION_PREVIEW_CHARS ? "…" : ""}
        </Text>
      </Box>
    </Stack>
  );
}

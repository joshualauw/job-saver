import { Alert, Box, Button, Collapsible, Heading, Stack, Text } from "@chakra-ui/react";

import { AppError } from "@/core/errors";
import { JobDraftPreview } from "@/features/ai-extract/JobDraftPreview";
import { PagePayloadPreview } from "@/features/page-extract/PagePayloadPreview";
import { ApiKeyField } from "@/features/settings/ApiKeyField";
import { useSettings } from "@/features/settings/use-settings";

import { useAnalyzeJob } from "./use-analyze-job";

function errorMessage(error: unknown): string {
  return error instanceof AppError ? error.message : "Something went wrong while analyzing the page.";
}

export function App() {
  const { settings } = useSettings();
  const analyze = useAnalyzeJob();
  const hasKey = Boolean(settings?.openaiApiKey);

  return (
    <Box as="main" p="4">
      <Stack gap="4">
        <Box>
          <Heading size="md">Job Saver</Heading>
          <Text mt="1" color="fg.muted">
            Open a Jobstreet job posting, then analyze it.
          </Text>
        </Box>

        <ApiKeyField />

        <Button
          onClick={() => analyze.mutate()}
          loading={analyze.isPending}
          loadingText="Reading page and asking AI"
          disabled={!hasKey}
        >
          Analyze this page
        </Button>

        {analyze.isError && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{errorMessage(analyze.error)}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {analyze.data && (
          <Stack gap="4">
            <JobDraftPreview values={analyze.data.values} missing={analyze.data.missing} />

            <Collapsible.Root>
              <Collapsible.Trigger asChild>
                <Button variant="ghost" size="sm" alignSelf="flex-start">
                  Page data
                </Button>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Box pt="2">
                  <PagePayloadPreview payload={analyze.data.payload} />
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

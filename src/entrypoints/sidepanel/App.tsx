import { Alert, Box, Button, Heading, Stack, Text } from "@chakra-ui/react";

import { AppError } from "@/core/errors";
import { PagePayloadPreview } from "@/features/page-extract/PagePayloadPreview";
import { useExtractPage } from "@/features/page-extract/use-extract-page";

function errorMessage(error: unknown): string {
  return error instanceof AppError ? error.message : "Something went wrong while reading the page.";
}

export function App() {
  const extract = useExtractPage();

  return (
    <Box as="main" p="4">
      <Stack gap="4">
        <Box>
          <Heading size="md">Job Saver</Heading>
          <Text mt="1" color="fg.muted">
            Open a Jobstreet job posting, then analyze it.
          </Text>
        </Box>

        <Button onClick={() => extract.mutate()} loading={extract.isPending} loadingText="Reading page">
          Analyze this page
        </Button>

        {extract.isError && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{errorMessage(extract.error)}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {extract.data && <PagePayloadPreview payload={extract.data} />}
      </Stack>
    </Box>
  );
}

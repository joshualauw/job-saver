import { Alert, Box, Button, Collapsible, Heading, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";

import { AppError } from "@/core/errors";
import type { PagePayload } from "@/core/page-payload";
import { JobForm } from "@/features/job-form/JobForm";
import { toFormInputs } from "@/features/job-form/form-values";
import type { FormInputs } from "@/features/job-form/form-values";
import { useDraft } from "@/features/job-form/use-draft";
import { PagePayloadPreview } from "@/features/page-extract/PagePayloadPreview";
import { ApiKeyField } from "@/features/settings/ApiKeyField";
import { SpreadsheetField } from "@/features/settings/SpreadsheetField";
import { useSettings } from "@/features/settings/use-settings";

import { useAnalyzeJob } from "./use-analyze-job";
import { useSaveJob } from "./use-save-job";

/** What the form is currently showing: a fresh analysis, or a draft restored on reopen. */
interface Session {
  /** Changes per analysis so the form remounts with fresh values. */
  readonly id: number;
  readonly url: string;
  readonly inputs: FormInputs;
  readonly missing: readonly string[];
  /** The values came from a row already in the sheet. */
  readonly existing: boolean;
  /** Only present for an analysis made in this panel session. */
  readonly payload: PagePayload | null;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof AppError ? error.message : fallback;
}

export function App() {
  const { settings } = useSettings();
  const analyze = useAnalyzeJob();
  const save = useSaveJob();
  const draft = useDraft();
  const [analysis, setAnalysis] = useState<Session | null>(null);
  const hasKey = Boolean(settings?.openaiApiKey);
  const hasSheet = Boolean(settings?.spreadsheetId);

  const restored: Session | null = draft.restored
    ? {
        id: 0,
        url: draft.restored.url,
        inputs: draft.restored.inputs,
        missing: draft.restored.missing,
        existing: draft.restored.existing ?? false,
        payload: null,
      }
    : null;
  const session = analysis ?? restored;

  const { persist } = draft;
  const sessionUrl = session?.url;
  const sessionMissing = session?.missing;
  const sessionExisting = session?.existing;
  const handleChange = useCallback(
    (inputs: FormInputs) => {
      if (sessionUrl !== undefined && sessionMissing !== undefined) {
        persist({ url: sessionUrl, inputs, missing: [...sessionMissing], existing: sessionExisting });
      }
    },
    [persist, sessionUrl, sessionMissing, sessionExisting],
  );

  const runAnalysis = () => {
    save.reset();
    analyze.mutate(undefined, {
      onSuccess: (result) => {
        const next: Session = {
          id: Date.now(),
          url: result.payload.url,
          inputs: toFormInputs(result.values),
          missing: result.missing,
          existing: result.existing,
          payload: result.payload,
        };
        draft.saveNow({ url: next.url, inputs: next.inputs, missing: [...next.missing], existing: next.existing });
        setAnalysis(next);
      },
    });
  };

  const discard = () => {
    draft.discard();
    setAnalysis(null);
    analyze.reset();
    save.reset();
  };

  const saveJob = (values: Parameters<typeof save.mutate>[0]) => {
    save.mutate(values, {
      // Done: clear the form so the next Analyze starts fresh.
      onSuccess: () => {
        draft.discard();
        setAnalysis(null);
      },
    });
  };

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
        <SpreadsheetField />

        <Button
          onClick={runAnalysis}
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
              <Alert.Title>{errorMessage(analyze.error, "Something went wrong while analyzing the page.")}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {save.isError && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{errorMessage(save.error, "Something went wrong while saving.")}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {save.data && (
          <Alert.Root status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {save.data.action === "created"
                  ? `Saved to your sheet (row ${save.data.row})`
                  : `Updated row ${save.data.row} in your sheet`}
              </Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {session && (
          <Stack gap="4">
            {session.existing && (
              <Alert.Root status="info">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Already in your sheet</Alert.Title>
                  <Alert.Description>
                    Showing the saved row. Saving updates it instead of adding a new one.
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            <JobForm
              key={session.id}
              initialInputs={session.inputs}
              missing={session.missing}
              onChange={handleChange}
              onSave={saveJob}
              onDiscard={discard}
              saving={save.isPending}
              saveDisabledReason={hasSheet ? null : "Add your Google spreadsheet above to save."}
            />

            {session.payload && (
              <Collapsible.Root>
                <Collapsible.Trigger asChild>
                  <Button variant="ghost" size="sm" alignSelf="flex-start">
                    Page data
                  </Button>
                </Collapsible.Trigger>
                <Collapsible.Content>
                  <Box pt="2">
                    <PagePayloadPreview payload={session.payload} />
                  </Box>
                </Collapsible.Content>
              </Collapsible.Root>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

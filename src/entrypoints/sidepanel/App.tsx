import { Alert, Box, Button, Collapsible, Heading, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";

import { platforms } from "@/config/platforms";
import { AppError, PageAccessError } from "@/core/errors";
import { isSameJobPage } from "@/core/page-match";
import type { PagePayload } from "@/core/page-payload";
import { JobForm } from "@/features/job-form/JobForm";
import { toFormInputs } from "@/features/job-form/form-values";
import type { FormInputs } from "@/features/job-form/form-values";
import { useDraft } from "@/features/job-form/use-draft";
import { PagePayloadPreview } from "@/features/page-extract/PagePayloadPreview";
import { requestSiteAccess } from "@/lib/chrome";
import { parseHttpUrl, sitePattern } from "@/lib/url";
import { SettingsView } from "@/features/settings/SettingsView";
import { isSetupComplete } from "@/features/settings/setup-status";
import { useSettings } from "@/features/settings/use-settings";

import { toaster } from "@/theme/toast";

import { analyzeLabel } from "./analyze-label";
import { useActiveTabUrl } from "./use-active-tab-url";
import { useAnalyzeJob } from "./use-analyze-job";
import { useSaveJob } from "./use-save-job";
import { useSelectionLength } from "./use-selection-length";
import { useVerifyConnection } from "./use-verify-connection";

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

type View = "job" | "settings";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof AppError ? error.message : fallback;
}

export function App() {
  const { settings, isLoading } = useSettings();
  const analyze = useAnalyzeJob();
  const save = useSaveJob();
  const draft = useDraft();
  const connection = useVerifyConnection();
  const activeUrl = useActiveTabUrl();
  const [analysis, setAnalysis] = useState<Session | null>(null);
  // Null until the user picks a view, so the first run can open Settings by itself.
  const [chosenView, setChosenView] = useState<View | null>(null);

  const hasKey = Boolean(settings?.openaiApiKey);
  const hasSheet = Boolean(settings?.spreadsheetId);
  const setupComplete = isSetupComplete(settings);
  const firstRun = chosenView === null && !isLoading && !setupComplete;
  const view: View = chosenView ?? (firstRun ? "settings" : "job");
  const selectionLength = useSelectionLength(view === "job" && !analyze.isPending);

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
  // Unknown until the first tab answer arrives, so no notice flashes on open.
  const isStale = session !== null && activeUrl !== undefined && !isSameJobPage(session.url, activeUrl, platforms);

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

  const runAnalysis = (refresh: boolean) => {
    save.reset();
    analyze.mutate(
      { refresh },
      {
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
      },
    );
  };

  // The tab's site, when Analyze failed only because the extension may not read it yet.
  const accessPattern = analyze.error instanceof PageAccessError && activeUrl ? sitePattern(activeUrl) : null;
  const accessHost = activeUrl ? parseHttpUrl(activeUrl)?.hostname : undefined;

  const allowSite = () => {
    if (!accessPattern) return;
    // Chrome only shows the prompt for a call made directly from the click, so nothing is awaited first.
    void requestSiteAccess(accessPattern).then((granted) => {
      if (granted) runAnalysis(false);
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
      onSuccess: (result) => {
        draft.discard();
        setAnalysis(null);
        toaster.create({
          type: "success",
          title:
            result.action === "created"
              ? `Saved to your sheet (row ${result.row})`
              : `Updated row ${result.row} in your sheet`,
        });
      },
    });
  };

  return (
    <Box as="main" p="4">
      <Stack gap="4">
        <HStack justify="space-between" align="start">
          <Box>
            <Heading size="md">Job Saver</Heading>
            {view === "job" && (
              <Text mt="1" color="fg.muted">
                Open a job posting, then analyze it.
              </Text>
            )}
          </Box>
          {!firstRun && (
            <Button size="xs" variant="ghost" onClick={() => setChosenView(view === "settings" ? "job" : "settings")}>
              {view === "settings" ? "Back to jobs" : "Settings"}
            </Button>
          )}
        </HStack>

        {view === "settings" && (
          <SettingsView
            onboarding={firstRun}
            onDone={() => setChosenView("job")}
            connection={connection.state}
            onTestConnection={connection.run}
          />
        )}

        {/* Kept mounted (just hidden) while Settings is open, so form edits are not lost. */}
        <Box display={view === "job" ? "block" : "none"}>
          <Stack gap="4">
            {!setupComplete && !isLoading && (
              <Alert.Root status="info">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Finish setup</Alert.Title>
                  <Alert.Description>Add your OpenAI key and Google spreadsheet in Settings.</Alert.Description>
                </Alert.Content>
                <Button size="xs" variant="outline" onClick={() => setChosenView("settings")}>
                  Open Settings
                </Button>
              </Alert.Root>
            )}

            <Button
              onClick={() => runAnalysis(false)}
              loading={analyze.isPending}
              loadingText="Reading page and asking AI"
              disabled={!hasKey}
            >
              {analyzeLabel(selectionLength)}
            </Button>

            {analyze.isError && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {errorMessage(analyze.error, "Something went wrong while analyzing the page.")}
                  </Alert.Title>
                  {accessPattern && (
                    <Button size="xs" variant="outline" alignSelf="flex-start" mt="2" onClick={allowSite}>
                      Allow Job Saver on {accessHost}
                    </Button>
                  )}
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

            {draft.isLoading && <Skeleton height="40" />}

            {session && (
              <Stack gap="4">
                {isStale && (
                  <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>This form is for a different page</Alert.Title>
                      <Alert.Description>
                        The tab you are on is not the job below. Analyze this page to replace it, or keep editing.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}

                {session.existing && (
                  <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Already in your sheet</Alert.Title>
                      <Alert.Description>
                        Showing the saved row. Saving updates it instead of adding a new one.
                      </Alert.Description>
                      {!isStale && hasKey && (
                        <Button
                          size="xs"
                          variant="outline"
                          alignSelf="flex-start"
                          mt="2"
                          onClick={() => runAnalysis(true)}
                          loading={analyze.isPending}
                          loadingText="Asking AI"
                        >
                          Re-analyze with AI
                        </Button>
                      )}
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
                  saveDisabledReason={hasSheet ? null : "Add your Google spreadsheet in Settings to save."}
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
      </Stack>
    </Box>
  );
}

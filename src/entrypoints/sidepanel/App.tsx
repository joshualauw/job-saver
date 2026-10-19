import { Alert, Box, Button, Heading, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";

import { AppError } from "@/core/errors";
import { newJobId } from "@/core/job-id";
import { AssessmentCard } from "@/features/ai-assess/AssessmentCard";
import { JobForm } from "@/features/job-form/JobForm";
import { toFormInputs } from "@/features/job-form/form-values";
import type { FormInputs } from "@/features/job-form/form-values";
import { useDraft } from "@/features/job-form/use-draft";
import { JobInput } from "@/features/job-input/JobInput";
import { useJobInput } from "@/features/job-input/use-job-input";
import { SettingsView } from "@/features/settings/SettingsView";
import { isSetupComplete } from "@/features/settings/setup-status";
import { useSettings } from "@/features/settings/use-settings";

import { toaster } from "@/theme/toast";

import { useAnalyzeJob } from "./use-analyze-job";
import { useBackfillIds } from "./use-backfill-ids";
import { useJobList } from "./use-job-list";
import { useSaveJob } from "./use-save-job";
import { useVerifyConnection } from "./use-verify-connection";

/** What the form is currently showing: a fresh analysis, or a draft restored on reopen. */
interface Session {
  /** Changes per analysis so the form remounts with fresh values. */
  readonly id: number;
  readonly inputs: FormInputs;
  readonly missing: readonly string[];
  /** Why the assessment is missing after an attempt; only present for an analysis made in this panel session. */
  readonly assessmentError: string | null;
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
  const backfill = useBackfillIds();
  const input = useJobInput();
  const [analysis, setAnalysis] = useState<Session | null>(null);
  // Null until the user picks a view, so the first run can open Settings by itself.
  const [chosenView, setChosenView] = useState<View | null>(null);

  const hasKey = Boolean(settings?.openaiApiKey);
  const hasSheet = Boolean(settings?.spreadsheetId);
  const setupComplete = isSetupComplete(settings);
  const firstRun = chosenView === null && !isLoading && !setupComplete;
  const view: View = chosenView ?? (firstRun ? "settings" : "job");

  const restored = useMemo<Session | null>(
    () =>
      draft.restored
        ? {
            id: 0,
            // A draft saved before job IDs existed has none; the form needs one to save.
            inputs: { ...draft.restored.inputs, jobId: draft.restored.inputs["jobId"] || newJobId() },
            missing: draft.restored.missing,
            assessmentError: null,
          }
        : null,
    [draft.restored],
  );
  const session = analysis ?? restored;
  // Fetched once a form is on screen, so Google's sign-in prompt (first use only) follows a user action.
  const jobList = useJobList(settings, session !== null);

  const { persist } = draft;
  const sessionMissing = session?.missing;
  const handleChange = useCallback(
    (inputs: FormInputs) => {
      if (sessionMissing !== undefined) persist({ inputs, missing: [...sessionMissing] });
    },
    [persist, sessionMissing],
  );

  const runAnalysis = () => {
    if (input.analyzeInput === null) return;
    save.reset();
    analyze.mutate(input.analyzeInput, {
      onSuccess: (result) => {
        const next: Session = {
          id: Date.now(),
          inputs: toFormInputs(result.values),
          missing: result.missing,
          assessmentError: result.assessmentError,
        };
        draft.saveNow({ inputs: next.inputs, missing: [...next.missing] });
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
      onSuccess: (result) => {
        draft.discard();
        input.clearActive();
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
                Add a job posting as text, an image or a file, then analyze it.
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
            backfill={backfill.state}
            onBackfillIds={backfill.run}
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

            <JobInput input={input} onAnalyze={runAnalysis} analyzing={analyze.isPending} blocked={!hasKey} />

            {analyze.isError && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {errorMessage(analyze.error, "Something went wrong while analyzing the text.")}
                  </Alert.Title>
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
                {session.assessmentError && (
                  <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Couldn't judge this job</Alert.Title>
                      <Alert.Description>
                        {session.assessmentError} Analyze again to retry.
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
                  jobList={jobList}
                  assessment={<AssessmentCard inputs={session.inputs} />}
                  saveDisabledReason={hasSheet ? null : "Add your Google spreadsheet in Settings to save."}
                />

              </Stack>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

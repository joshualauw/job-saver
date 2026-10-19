import { Alert, Button, Field, Heading, HStack, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { useForm } from "react-hook-form";

import { appConfig } from "@/config/app";
import { hasOAuthClient } from "@/lib/chrome";
import type { Settings } from "@/lib/storage";
import { toaster } from "@/theme/toast";

import { formatPreferences } from "./parse-preferences";
import { isSetupComplete, setupSteps } from "./setup-status";
import { settingsResolver, validateSettings } from "./validate-settings";
import type { SettingsInputs } from "./validate-settings";
import { useSettings } from "./use-settings";

/** State of "Test connection": the caller reports success itself, so only a failure is shown here. */
export interface ConnectionState {
  readonly isPending: boolean;
  /** User-safe text for the last failed test. */
  readonly error: string | null;
}

interface Props {
  /** First run: shows the welcome and returns to the job screen once setup is complete. */
  onboarding: boolean;
  onDone: () => void;
  connection: ConnectionState;
  onTestConnection: () => void;
  /** State of "Add missing Job IDs", which writes IDs into rows saved before IDs existed. */
  backfill: ConnectionState;
  onBackfillIds: () => void;
}

function toInputs(settings: Settings | undefined): SettingsInputs {
  return {
    // The saved key is never shown; leaving this blank keeps it.
    apiKey: "",
    model: settings?.openaiModel ?? "",
    spreadsheet: settings?.spreadsheetId ?? "",
    tab: settings?.sheetTab ?? "",
    preferences: formatPreferences(settings?.preferences),
  };
}

export function SettingsView({ onboarding, onDone, connection, onTestConnection, backfill, onBackfillIds }: Props) {
  const { settings, save } = useSettings();
  const form = useForm<SettingsInputs>({ resolver: settingsResolver, defaultValues: toInputs(settings) });

  const { errors, isDirty } = form.formState;
  const hasKey = Boolean(settings?.openaiApiKey);

  const submit = form.handleSubmit((data) => {
    const result = validateSettings(data);
    if (!result.ok) return;
    save.mutate(result.patch, {
      onSuccess: (next) => {
        form.reset(toInputs(next));
        if (onboarding && isSetupComplete(next)) onDone();
        else toaster.create({ type: "success", title: "Settings saved" });
      },
    });
  });

  return (
    <Stack gap="4">
      <Stack gap="1">
        <Heading size="sm">{onboarding ? "Welcome to Job Saver" : "Settings"}</Heading>
        {onboarding && <Text color="fg.muted">Two things before you can analyze and save jobs:</Text>}
        <Stack gap="0.5" pt="1">
          {setupSteps(settings).map((step) => (
            <Text key={step.id} color={step.done ? "fg" : "fg.muted"}>
              {step.done ? "✓" : "○"} {step.label}
            </Text>
          ))}
        </Stack>
      </Stack>

      {!hasOAuthClient() && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Google sign-in is not configured in this build</Alert.Title>
            <Alert.Description>Add OAUTH_CLIENT_ID to .env.local and rebuild the extension.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      <form onSubmit={submit} noValidate>
        <Stack gap="3">
          <Field.Root>
            <Field.Label>OpenAI API key</Field.Label>
            {/* Never rendered back: the saved key is only ever replaced or removed. */}
            <Input
              {...form.register("apiKey")}
              type="password"
              autoComplete="off"
              size="sm"
              placeholder={hasKey ? "Saved. Leave blank to keep it." : "sk-..."}
            />
            <Field.HelperText>Stored only in this browser.</Field.HelperText>
          </Field.Root>
          {hasKey && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              alignSelf="flex-start"
              onClick={() => save.mutate({ openaiApiKey: "" })}
            >
              Remove saved key
            </Button>
          )}

          <Field.Root>
            <Field.Label>Model (optional)</Field.Label>
            <Input {...form.register("model")} autoComplete="off" size="sm" placeholder={appConfig.openaiModel} />
          </Field.Root>

          <Field.Root invalid={errors.spreadsheet !== undefined}>
            <Field.Label>Google spreadsheet</Field.Label>
            <Input {...form.register("spreadsheet")} autoComplete="off" size="sm" placeholder="Spreadsheet URL or ID" />
            {errors.spreadsheet?.message && <Field.ErrorText>{errors.spreadsheet.message}</Field.ErrorText>}
          </Field.Root>

          <Field.Root>
            <Field.Label>Tab name (optional)</Field.Label>
            <Input {...form.register("tab")} autoComplete="off" size="sm" placeholder={appConfig.defaultSheetTab} />
            <Field.HelperText>Row 1 of this tab must contain the column headers.</Field.HelperText>
          </Field.Root>

          <Field.Root invalid={errors.preferences !== undefined}>
            <Field.Label>Preferences (optional)</Field.Label>
            <Textarea
              {...form.register("preferences")}
              autoComplete="off"
              size="sm"
              rows={4}
              placeholder={"Remote work\nSalary above 10M"}
            />
            {errors.preferences?.message ? (
              <Field.ErrorText>{errors.preferences.message}</Field.ErrorText>
            ) : (
              <Field.HelperText>What you want from a job, one per line.</Field.HelperText>
            )}
          </Field.Root>

          {save.isError && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Couldn't save settings</Alert.Title>
              </Alert.Content>
            </Alert.Root>
          )}

          <HStack>
            <Button type="submit" flex="1" loading={save.isPending} disabled={!isDirty}>
              Save settings
            </Button>
            {!onboarding && (
              <Button type="button" variant="outline" onClick={onDone}>
                Back
              </Button>
            )}
          </HStack>
        </Stack>
      </form>

      <Stack gap="2">
        <Button
          variant="outline"
          size="sm"
          onClick={onTestConnection}
          loading={connection.isPending}
          disabled={!settings?.spreadsheetId || isDirty}
        >
          Test connection
        </Button>
        {isDirty && (
          <Text fontSize="xs" color="fg.muted">
            Save your changes to test them.
          </Text>
        )}
        {connection.error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{connection.error}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}
      </Stack>

      <Stack gap="2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBackfillIds}
          loading={backfill.isPending}
          disabled={!settings?.spreadsheetId || isDirty}
        >
          Add missing Job IDs
        </Button>
        <Text fontSize="xs" color="fg.muted">
          Once, for jobs saved before IDs existed. Writes only the Job ID column.
        </Text>
        {backfill.error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{backfill.error}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}
      </Stack>
    </Stack>
  );
}

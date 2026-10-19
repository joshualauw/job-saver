import { Alert, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";

import type { JobValues } from "@/config/fields";
import { newJobId } from "@/core/job-id";

import { FieldInput } from "./FieldInput";
import { SaveToPicker } from "./SaveToPicker";
import type { JobListState } from "./SaveToPicker";
import { jobFormResolver, validateInputs } from "./validate";
import { formFields } from "./form-values";
import type { FormInputs } from "./form-values";

interface Props {
  initialInputs: FormInputs;
  /** Keys of fields the AI could not find. */
  missing: readonly string[];
  /** Called with the full form state after every edit. */
  onChange: (inputs: FormInputs) => void;
  /** Called with validated, typed values when the user saves. */
  onSave: (values: JobValues) => void;
  onDiscard: () => void;
  saving: boolean;
  /** Why saving is unavailable right now, if it is. */
  saveDisabledReason: string | null;
  /** The sheet's saved jobs for Save To; absent when no sheet is set up, which hides the picker. */
  jobList?: JobListState | null;
  /** Shown under the fields, above the Save buttons. Supplied by the panel so features stay separate. */
  assessment?: ReactNode;
}

export function JobForm({
  initialInputs,
  missing,
  onChange,
  onSave,
  onDiscard,
  saving,
  saveDisabledReason,
  jobList,
  assessment,
}: Props) {
  const form = useForm<FormInputs>({ defaultValues: initialInputs, resolver: jobFormResolver, mode: "onBlur" });

  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => onChange(values),
    });
  }, [form, onChange]);

  const current = useWatch({ control: form.control });
  const { errors } = form.formState;

  // The form's job ID belongs to a saved job exactly when Save To picked it (a new draft's ID is not in the sheet).
  const target = jobList?.jobs.find((job) => job.id === current["jobId"]) ?? null;
  // The ID is code-owned and hidden, so retargeting swaps it: Save then updates that job's row.
  const pickTarget = (jobId: string | null) => form.setValue("jobId", jobId ?? newJobId(), { shouldDirty: true });
  const errorCount = Object.keys(errors).length;

  const submit = form.handleSubmit((data) => {
    const result = validateInputs(data);
    if (result.ok) onSave(result.values);
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="3">
        {formFields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            register={form.register}
            control={form.control}
            error={errors[field.key]?.message}
            notFound={missing.includes(field.key) && (current[field.key] ?? "").trim() === ""}
          />
        ))}

        {assessment}

        {jobList && <SaveToPicker list={jobList} target={target} onPick={pickTarget} />}

        {errorCount > 0 && (
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {errorCount} {errorCount === 1 ? "field needs" : "fields need"} attention
              </Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {saveDisabledReason && (
          <Text fontSize="xs" color="fg.muted">
            {saveDisabledReason}
          </Text>
        )}

        <HStack>
          <Button type="submit" flex="1" loading={saving} disabled={saveDisabledReason !== null}>
            {target ? "Update job" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onDiscard} disabled={saving}>
            Discard
          </Button>
        </HStack>
      </Stack>
    </form>
  );
}

import { fields } from "@/config/fields";
import { LIST_SEPARATOR, splitList } from "@/core/normalize";

/**
 * Fields shown as inputs. Assessment fields are shown in the assessment card and code-owned fields (the
 * job ID) are not shown at all; both are still part of the form state and saved.
 */
export const formFields = fields.filter((field) => field.owner === "ai" || field.owner === "user");

/** Form state: every field as the string shown in its input, keyed by field key. */
export type FormInputs = Record<string, string>;

/** Typed draft values → strings for controlled inputs (`null` → empty, lists → "a, b"). */
export function toFormInputs(values: Readonly<Record<string, unknown>>): FormInputs {
  const inputs: FormInputs = {};
  for (const field of fields) {
    const value = values[field.key];
    if (value === null || value === undefined) inputs[field.key] = "";
    else if (Array.isArray(value)) inputs[field.key] = value.join(LIST_SEPARATOR);
    else inputs[field.key] = String(value);
  }
  return inputs;
}

/**
 * Strings → the typed shape the form schema expects (empty → `null`, numeric text → number,
 * comma text → list). Unparseable numbers stay as text so validation reports them.
 */
export function fromFormInputs(inputs: FormInputs): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = (inputs[field.key] ?? "").trim();
    if (field.type === "stringList") {
      values[field.key] = splitList(raw);
    } else if (raw === "") {
      values[field.key] = null;
    } else if (field.type === "number") {
      const parsed = Number(raw);
      values[field.key] = Number.isFinite(parsed) ? parsed : raw;
    } else {
      values[field.key] = raw;
    }
  }
  return values;
}

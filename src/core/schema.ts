import { z } from "zod";

import { normalizeList } from "./normalize";
import type { FieldDef, LlmValuesOf, ValuesOf } from "./types";

function enumValues(field: FieldDef): [string, ...string[]] {
  const values = field.options?.map((option) => option.value) ?? [];
  const [first, ...rest] = values;
  if (first === undefined) {
    throw new Error(`Enum field "${field.key}" has no options`);
  }
  return [first, ...rest];
}

type SchemaMode = "form" | "llm";

/**
 * Non-null schema for one field. The "llm" mode stays JSON-Schema representable (no
 * transforms) and defers save-time rules such as non-empty strings to the "form" mode.
 */
function baseSchema(field: FieldDef, mode: SchemaMode): z.ZodType {
  const requireNonEmpty = mode === "form" && field.required === true;

  switch (field.type) {
    case "string":
    case "text": {
      const text = z.string().trim();
      return requireNonEmpty ? text.min(1) : text;
    }
    case "number":
      return z.number().finite().nonnegative();
    case "date":
      return z.iso.date();
    case "enum":
      return z.enum(enumValues(field));
    case "stringList": {
      const items = z.array(z.string());
      if (mode === "llm") return items;
      // Normalised on the way out so downstream code always sees lowercase, unique entries.
      const normalized = items.transform(normalizeList);
      return requireNonEmpty ? normalized.refine((list) => list.length > 0) : normalized;
    }
  }
}

/**
 * Validates a complete record at save time. `required` fields must be non-empty,
 * `nullable` fields may be `null`, everything else must be present and valid.
 */
export function buildFormSchema<const Fs extends readonly FieldDef[]>(fields: Fs): z.ZodType<ValuesOf<Fs>> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    const base = baseSchema(field, "form");
    shape[field.key] = field.nullable ? base.nullable() : base;
  }
  // The runtime shape is built dynamically; `ValuesOf` is its static description.
  return z.object(shape) as unknown as z.ZodType<ValuesOf<Fs>>;
}

/**
 * Schema for OpenAI Structured Outputs. Only `source: "ai"` fields. Strict mode needs every
 * property present, so "unknown" is `null` (or an empty array for lists), and each field's
 * hint travels as its description.
 */
export function buildLlmSchema<const Fs extends readonly FieldDef[]>(fields: Fs): z.ZodType<LlmValuesOf<Fs>> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    if (field.source !== "ai") continue;
    const base = baseSchema(field, "llm");
    const schema = field.type === "stringList" ? base : base.nullable();
    shape[field.key] = field.hint ? schema.describe(field.hint) : schema;
  }
  return z.object(shape) as unknown as z.ZodType<LlmValuesOf<Fs>>;
}

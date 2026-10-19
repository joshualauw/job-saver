import type { PagePayload } from "./page-payload";

/**
 * Who is responsible for a value. `assessment` values come from a separate AI judgement of the job
 * against the user (never from extraction); they are shown in a card, not as form inputs.
 */
export type FieldSource = "ai" | "derived" | "user" | "assessment";
/** `stringList` is a list of lowercase strings (e.g. skills); one comma-separated sheet cell. */
export type FieldType = "string" | "text" | "url" | "number" | "date" | "enum" | "stringList";

export interface EnumOption {
  readonly value: string;
  readonly label: string;
}

export interface FieldDef {
  /** camelCase, stable identifier in code. */
  readonly key: string;
  /** Exact header text in row 1 of the Google Sheet. */
  readonly column: string;
  readonly label: string;
  readonly type: FieldType;
  /** Who is responsible for the value. */
  readonly source: FieldSource;
  /** Instruction for the LLM; only meaningful for `source: "ai"`. */
  readonly hint?: string;
  /** Allowed values for `type: "enum"`; the sheet receives `label`. */
  readonly options?: readonly EnumOption[];
  /** Must be non-empty to save. Mutually exclusive with `nullable`. */
  readonly required?: boolean;
  /**
   * `null` is a legitimate answer ("unknown" / "not applicable"). Not used for `stringList`,
   * where an empty array already means "none".
   */
  readonly nullable?: boolean;
  /**
   * Common values offered as a template for a free-text field; any text is still valid. Unlike
   * `options`, this is not a closed list.
   */
  readonly suggestions?: readonly string[];
  /** Carried through the form and saved, but never shown as an input (e.g. the job ID). */
  readonly hidden?: boolean;
}

type FieldBaseValue<F extends FieldDef> = F["type"] extends "number"
  ? number
  : F["type"] extends "stringList"
    ? string[]
    : F["type"] extends "enum"
      ? F extends { readonly options: readonly (infer O)[] }
        ? O extends { readonly value: infer V }
          ? V
          : never
        : string
      : string;

type FieldValue<F extends FieldDef> = FieldBaseValue<F> | (F extends { nullable: true } ? null : never);

type LlmFieldValue<F extends FieldDef> = F["type"] extends "stringList" ? string[] : FieldValue<F> | null;

/** Typed values for a `const` field list, keyed by `FieldDef.key`. */
export type ValuesOf<Fs extends readonly FieldDef[]> = {
  -readonly [F in Fs[number] as F["key"]]: FieldValue<F>;
};

/**
 * What the LLM returns: only `source: "ai"` fields. Each is nullable ("not found"), except
 * lists, where an empty array means "none".
 */
export type LlmValuesOf<Fs extends readonly FieldDef[]> = {
  -readonly [F in Fs[number] as F extends { source: "ai" } ? F["key"] : never]: LlmFieldValue<F>;
};

/** Values of the fields judged by the assessor: only `source: "assessment"` fields. */
export type AssessmentValuesOf<Fs extends readonly FieldDef[]> = {
  -readonly [F in Fs[number] as F extends { source: "assessment" } ? F["key"] : never]: FieldValue<F>;
};

/** Where to find a platform's job content in the page DOM. */
export interface PlatformContentSelectors {
  /** Label → CSS selector. The first match's text becomes a labelled fact for the extractor. */
  readonly facts: Readonly<Record<string, string>>;
  /** CSS selector of the main job ad body. */
  readonly description: string;
}

export interface PlatformDef {
  /** Stable identifier, e.g. "jobstreet". */
  readonly id: string;
  /** Display name written to the sheet's Platform column. */
  readonly name: string;
  matchesHost(hostname: string): boolean;
  /** Returns the clean, canonical job URL for this platform. */
  canonicalizeUrl(url: URL): URL;
  /** Absent → the generic whole-page fallback is used. */
  readonly content?: PlatformContentSelectors;
}

export interface JobSource {
  /** Platform name for the Platform column. */
  readonly platform: string;
  /** Clean job URL for the Job URL column. */
  readonly jobUrl: string;
}

/** A saved job as the Save To picker shows it: identity plus enough text to recognise it. */
export interface ListedJob {
  readonly id: string;
  readonly company: string;
  readonly jobTitle: string;
  readonly platform: string | null;
  /** 1-based sheet row. Informational only: it is never stored, rows are re-found by ID. */
  readonly row: number;
}

export interface SaveResult {
  readonly action: "created" | "updated";
  readonly row: number;
}

/** Where jobs are saved (Google Sheets today); implementations live in features. */
export interface Sink {
  /** Every saved job that has an ID, in sheet order. */
  list(): Promise<ListedJob[]>;
  /** Writes a new row, or updates the existing row with the same job ID. */
  save(values: Readonly<Record<string, unknown>>): Promise<SaveResult>;
  /** Gives an ID to every job row that has none (rows saved before IDs existed). */
  backfillIds(): Promise<{ readonly filled: number }>;
  /**
   * Checks the destination is reachable and has every configured column; throws a typed error
   * naming what is wrong. `columns` is how many configured columns were found.
   */
  verify(): Promise<{ readonly columns: number }>;
}

/** Turns page content into typed values (OpenAI today); implementations live in features. */
export interface Extractor<T> {
  extract(payload: PagePayload): Promise<T>;
}

/** What the assessor judges a job against. The preferences are the user's own. */
export interface AssessmentInput {
  readonly payload: PagePayload;
  /** One entry per preference; empty when none are set. */
  readonly preferences: readonly string[];
}

/** Judges how well a job fits the user (OpenAI today); implementations live in features. */
export interface Assessor<T> {
  assess(input: AssessmentInput): Promise<T>;
}

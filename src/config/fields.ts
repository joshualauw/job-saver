import { buildFormSchema, buildLlmSchema } from "@/core/schema";
import type { AssessmentValuesOf, FieldDef, LlmValuesOf, ValuesOf } from "@/core/types";

const contractTypes = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
  { value: "temporary", label: "Temporary" },
  { value: "other", label: "Other" },
] as const;

const locationTypes = [
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
] as const;

const salaryPeriods = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

/** Where a job was found. A template for the Source field, not a closed list: any text is valid. */
const sourceSuggestions = [
  "LinkedIn",
  "Jobstreet",
  "Glints",
  "Indeed",
  "Kalibrr",
  "Company website",
  "Referral",
] as const;

/**
 * THE source of truth for tracked job fields. Schemas, the form, the LLM schema, and the
 * sheet mapping are all derived from this list (see ARCHITECTURE.md).
 */
export const fields = [
  {
    key: "company",
    column: "Company",
    label: "Company",
    type: "string",
    owner: "ai",
    required: true,
    hint: "The hiring company's name, not the job board or recruiter platform.",
  },
  {
    key: "jobTitle",
    column: "Job Title",
    label: "Job title",
    type: "string",
    owner: "ai",
    required: true,
    hint: "The job title exactly as written in the posting.",
  },
  {
    key: "address",
    column: "Address",
    label: "Address",
    type: "string",
    owner: "ai",
    nullable: true,
    hint: "Workplace address, or city/region if that is all that is given. Null if not stated.",
  },
  {
    key: "contractType",
    column: "Contract Type",
    label: "Contract type",
    type: "enum",
    owner: "ai",
    nullable: true,
    options: contractTypes,
    hint: "Employment type. Use 'other' if stated but not in the list; null if not stated.",
  },
  {
    key: "locationType",
    column: "Location Type",
    label: "Location type",
    type: "enum",
    owner: "ai",
    nullable: true,
    options: locationTypes,
    hint: "Remote or hybrid only when the posting says so (e.g. remote, jarak jauh, hybrid); otherwise onsite. Most postings are onsite and rarely state it, so default to onsite rather than null.",
  },
  {
    key: "source",
    column: "Source",
    label: "Source",
    type: "string",
    owner: "user",
    nullable: true,
    suggestions: sourceSuggestions,
  },
  {
    key: "sourceUrl",
    column: "Source URL",
    label: "Source URL",
    type: "url",
    owner: "user",
    nullable: true,
  },
  {
    key: "minYoe",
    column: "Min YOE",
    label: "Min years of experience",
    type: "number",
    owner: "ai",
    nullable: true,
    hint: "Minimum years of experience required. Null if not stated.",
  },
  {
    key: "skills",
    column: "Skills",
    label: "Skills",
    type: "stringList",
    owner: "ai",
    hint: "Short lowercase tags, at most 12, ordered technologies, then architecture, then domain (roughly 60/30/10, only what the posting states). Technologies: specific frameworks, libraries, databases, cloud and tools, e.g. node.js, next.js, postgres; prefer a framework over its language, and use the language only when no framework is named; never git, sql, database, html or css. Architecture: mvc, mvvm, microservices, oop. Domain: fintech, ats, crm, pos. No soft skills or general practices (debugging, problem solving, deployment). Empty array if none.",
  },
  {
    key: "salaryPeriod",
    column: "Salary Period",
    label: "Salary period",
    type: "enum",
    owner: "ai",
    nullable: true,
    options: salaryPeriods,
    hint: "The period the stated salary covers. Null if no salary is stated.",
  },
  {
    key: "salaryCurrency",
    column: "Salary Currency",
    label: "Salary currency",
    type: "string",
    owner: "ai",
    nullable: true,
    hint: "ISO 4217 code such as IDR, USD, SGD. Null if no salary is stated.",
  },
  {
    key: "minSalary",
    column: "Min Salary",
    label: "Min salary",
    type: "number",
    owner: "ai",
    nullable: true,
    hint: "Lower salary bound as a plain number in the stated period (8 juta -> 8000000). If only one figure is given, put it here. Never guess.",
  },
  {
    key: "maxSalary",
    column: "Max Salary",
    label: "Max salary",
    type: "number",
    owner: "ai",
    nullable: true,
    hint: "Upper salary bound as a plain number. Null when only one figure is given.",
  },
  {
    key: "summary",
    column: "Summary",
    label: "Summary",
    type: "text",
    owner: "ai",
    nullable: true,
    hint: "1-3 neutral sentences on what the role is and anything notable. Do not repeat the other fields.",
  },
  {
    key: "notes",
    column: "Notes",
    label: "Notes",
    type: "text",
    owner: "ai",
    nullable: true,
    hint: "Specific requirements, perks and conditions outside the core job, as short phrases separated by '; ': e.g. BPJS or insurance, working hours, visa or work-permit requirements, relocation support, bonuses, probation, sister company. Do not repeat the summary or other fields. Null if none are stated.",
  },
  {
    key: "preferenceFit",
    column: "Preference Fit",
    label: "Preference fit",
    type: "text",
    owner: "assessment",
    nullable: true,
  },
  {
    // Row identity in the sheet. Minted by code when a draft is created; the user never sees it.
    key: "jobId",
    column: "Job ID",
    label: "Job ID",
    type: "string",
    owner: "code",
    required: true,
  },
] as const satisfies readonly FieldDef[];

export type JobFieldKey = (typeof fields)[number]["key"];
export type JobValues = ValuesOf<typeof fields>;
/** What the model returns: AI-sourced fields only. */
export type LlmJobValues = LlmValuesOf<typeof fields>;
/** What the assessor produces: the assessment fields only. */
export type AssessmentValues = AssessmentValuesOf<typeof fields>;

export const jobFormSchema = buildFormSchema(fields);
export const jobLlmSchema = buildLlmSchema(fields);

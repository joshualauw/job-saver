import { buildFormSchema, buildLlmSchema } from "@/core/schema";
import type { FieldDef, ValuesOf } from "@/core/types";

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

const statuses = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "ghosted", label: "Ghosted" },
] as const;

const salaryPeriods = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

/**
 * THE source of truth for tracked job fields. Schemas, the form, the LLM schema, and the
 * sheet mapping are all derived from this list (ARCHITECTURE_V1.md §7).
 */
export const fields = [
  {
    key: "company",
    column: "Company",
    label: "Company",
    type: "string",
    source: "ai",
    required: true,
    hint: "The hiring company's name, not the job board or recruiter platform.",
  },
  {
    key: "jobTitle",
    column: "Job Title",
    label: "Job title",
    type: "string",
    source: "ai",
    required: true,
    hint: "The job title exactly as written in the posting.",
  },
  {
    key: "address",
    column: "Address",
    label: "Address",
    type: "string",
    source: "ai",
    nullable: true,
    hint: "Workplace address, or city/region if that is all that is given. Null if not stated.",
  },
  {
    key: "contractType",
    column: "Contract Type",
    label: "Contract type",
    type: "enum",
    source: "ai",
    nullable: true,
    options: contractTypes,
    hint: "Employment type. Use 'other' if stated but not in the list; null if not stated.",
  },
  {
    key: "locationType",
    column: "Location Type",
    label: "Location type",
    type: "enum",
    source: "ai",
    nullable: true,
    options: locationTypes,
    hint: "Onsite, hybrid, or remote. Null if not stated.",
  },
  {
    key: "platform",
    column: "Platform",
    label: "Platform",
    type: "string",
    source: "derived",
    required: true,
  },
  {
    key: "jobUrl",
    column: "Job URL",
    label: "Job URL",
    type: "string",
    source: "derived",
    required: true,
  },
  {
    key: "status",
    column: "Status",
    label: "Status",
    type: "enum",
    source: "user",
    required: true,
    options: statuses,
  },
  {
    key: "appliedAt",
    column: "Applied At",
    label: "Applied at",
    type: "date",
    source: "user",
    nullable: true,
  },
  {
    key: "lastUpdatedAt",
    column: "Last Updated At",
    label: "Last updated at",
    type: "date",
    source: "derived",
    nullable: true,
  },
  {
    key: "minYoe",
    column: "Min YOE",
    label: "Min years of experience",
    type: "number",
    source: "ai",
    nullable: true,
    hint: "Minimum years of experience required. Null if not stated.",
  },
  {
    key: "skills",
    column: "Skills",
    label: "Skills",
    type: "stringList",
    source: "ai",
    hint: "Technical skills the posting asks for or mentions: languages, frameworks, libraries, databases, cloud/tools, and methodologies. Lowercase, short canonical names such as node.js, postgres, typescript, java, mvc. No soft skills, degrees, or duplicates. Empty array if none.",
  },
  {
    key: "salaryPeriod",
    column: "Salary Period",
    label: "Salary period",
    type: "enum",
    source: "ai",
    nullable: true,
    options: salaryPeriods,
    hint: "The period the stated salary covers. Null if no salary is stated.",
  },
  {
    key: "salaryCurrency",
    column: "Salary Currency",
    label: "Salary currency",
    type: "string",
    source: "ai",
    nullable: true,
    hint: "ISO 4217 code such as IDR, USD, SGD. Null if no salary is stated.",
  },
  {
    key: "minSalary",
    column: "Min Salary",
    label: "Min salary",
    type: "number",
    source: "ai",
    nullable: true,
    hint: "Lower salary bound as a plain number in the stated period (8 juta -> 8000000). If only one figure is given, put it here. Never guess.",
  },
  {
    key: "maxSalary",
    column: "Max Salary",
    label: "Max salary",
    type: "number",
    source: "ai",
    nullable: true,
    hint: "Upper salary bound as a plain number. Null when only one figure is given.",
  },
  {
    key: "summary",
    column: "Summary",
    label: "Summary",
    type: "text",
    source: "ai",
    nullable: true,
    hint: "1-3 neutral sentences on what the role is and anything notable. Do not repeat the other fields.",
  },
] as const satisfies readonly FieldDef[];

export type JobFieldKey = (typeof fields)[number]["key"];
export type JobValues = ValuesOf<typeof fields>;

export const jobFormSchema = buildFormSchema(fields);
export const jobLlmSchema = buildLlmSchema(fields);

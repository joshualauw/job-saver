import { z } from "zod";

/**
 * What came from the page, ready to hand to the extractor:
 * - `selection`: the user's highlighted text (preferred when long enough)
 * - `platform`: text read through a platform's selectors
 * - `generic`: fallback text from `main` / `body`
 */
export const contentSourceSchema = z.enum(["selection", "platform", "generic"]);

export const pagePayloadSchema = z.object({
  /** Raw `location.href` of the page. */
  url: z.string().min(1),
  title: z.string(),
  /** Labelled values read via platform selectors, e.g. `{ Salary: "Rp 7.000.000 ..." }`. */
  facts: z.record(z.string(), z.string()),
  /** Cleaned main text of the job ad, already truncated to the input budget. */
  description: z.string(),
  /** `schema.org/JobPosting` objects found in JSON-LD; empty when the site has none. */
  jsonLd: z.array(z.unknown()),
  contentSource: contentSourceSchema,
});

export type ContentSource = z.infer<typeof contentSourceSchema>;
export type PagePayload = z.infer<typeof pagePayloadSchema>;

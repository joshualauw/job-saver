/**
 * What the extractor and assessor read: the text of one job posting, already cleaned and capped
 * to the input budget. The name is historical; the text now comes from a highlighted selection.
 */
export interface PagePayload {
  readonly description: string;
}

import type { PagePayload } from "./page-payload";

const MAX_JSON_LD_CHARS = 4_000;

/** Stops text from closing a fence or opening a new one. */
function escapeForFence(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Wraps text in an XML-style tag the system prompt can refer to, escaping it so it cannot break out. */
export function fence(tag: string, body: string): string {
  return `<${tag}>\n${escapeForFence(body)}\n</${tag}>`;
}

/**
 * The page as fenced sections, ready to join into a user message. Everything in here is untrusted
 * page content: it belongs in the user message only, never the system prompt.
 */
export function pagePromptSections(payload: PagePayload): string[] {
  const parts: string[] = [fence("page_url", payload.url)];

  if (payload.title.trim() !== "") parts.push(fence("page_title", payload.title));

  const facts = Object.entries(payload.facts);
  if (facts.length > 0) {
    parts.push(fence("facts", facts.map(([label, value]) => `${label}: ${value}`).join("\n")));
  }

  if (payload.description.trim() !== "") parts.push(fence("job_description", payload.description));

  if (payload.jsonLd.length > 0) {
    parts.push(fence("json_ld", JSON.stringify(payload.jsonLd).slice(0, MAX_JSON_LD_CHARS)));
  }

  return parts;
}

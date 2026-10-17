import { normalizeText } from "@/core/normalize";
import type { PagePayload } from "@/core/page-payload";
import type { PlatformDef } from "@/core/types";
import { parseHttpUrl } from "@/lib/url";

import { extractText } from "./dom-text";
import { readJobPostings } from "./json-ld";
import { MIN_SELECTION_CHARS } from "./selection";
import { truncateText } from "./truncate";

export interface BuildPayloadOptions {
  readonly platforms: readonly PlatformDef[];
  /** Upper bound on `description` length, in characters. */
  readonly maxChars: number;
  /** The user's highlighted text, if any (`window.getSelection()?.toString()`). */
  readonly selection: string | null;
}

function textOf(doc: Document, selector: string): string | null {
  const element = doc.querySelector(selector);
  if (!element) return null;
  const text = extractText(element);
  return text === "" ? null : text;
}

function readFacts(doc: Document, selectors: Readonly<Record<string, string>>): Record<string, string> {
  const facts: Record<string, string> = {};
  for (const [label, selector] of Object.entries(selectors)) {
    const text = textOf(doc, selector);
    // Facts are single values; flatten any line breaks.
    if (text) facts[label] = text.replace(/\s+/g, " ");
  }
  return facts;
}

function genericText(doc: Document): string {
  const root = doc.querySelector("main, [role='main']") ?? doc.body;
  return root ? extractText(root, { skipLandmarks: true }) : "";
}

/**
 * Builds the extractor input from a page. Pure over `Document` so it runs identically in the
 * injected script and in tests against saved pages.
 *
 * Description precedence: deliberate user selection → platform selectors → generic page text.
 * Facts come from platform selectors whenever they match, even if the description fell back.
 */
export function buildPagePayload(doc: Document, options: BuildPayloadOptions): PagePayload {
  const url = doc.defaultView?.location.href ?? "";
  const hostname = parseHttpUrl(url)?.hostname ?? "";
  const content = options.platforms.find((platform) => platform.matchesHost(hostname))?.content;

  const facts = content ? readFacts(doc, content.facts) : {};
  const selection = normalizeText(options.selection ?? "");

  let description: string;
  let contentSource: PagePayload["contentSource"];
  const platformText = content ? textOf(doc, content.description) : null;
  if (selection.length >= MIN_SELECTION_CHARS) {
    description = selection;
    contentSource = "selection";
  } else if (platformText) {
    description = platformText;
    contentSource = "platform";
  } else {
    description = genericText(doc);
    contentSource = "generic";
  }

  return {
    url,
    title: doc.title,
    facts,
    description: truncateText(description, options.maxChars),
    jsonLd: readJobPostings(doc),
    contentSource,
  };
}

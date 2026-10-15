import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Window } from "happy-dom";

const FIXTURES_ROOT = fileURLToPath(new URL("../fixtures/", import.meta.url));

export interface LoadedFixture {
  readonly url: string;
  readonly document: Document;
}

/**
 * Loads `tests/fixtures/<platform>/<n>/{url.txt,page.html}` into a happy-dom document whose
 * location is the page's real URL. Scripts and file loading are disabled: fixtures are
 * snapshots of rendered DOM, and tests must never execute third-party page code.
 */
export function loadFixture(platform: string, name: string): LoadedFixture {
  const dir = `${FIXTURES_ROOT}${platform}/${name}/`;
  const url = readFileSync(`${dir}url.txt`, "utf8").trim();
  const html = readFileSync(`${dir}page.html`, "utf8");

  const window = new Window({
    url,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableComputedStyleRendering: true,
    },
  });
  window.document.write(html);

  return { url, document: window.document as unknown as Document };
}

/** Parses an HTML string into a document at `url`, with the same safety settings. */
export function documentFromHtml(html: string, url: string): Document {
  const window = new Window({
    url,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableComputedStyleRendering: true,
    },
  });
  window.document.write(html);
  return window.document as unknown as Document;
}

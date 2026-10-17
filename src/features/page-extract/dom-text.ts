import { normalizeText } from "@/core/normalize";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const ALWAYS_SKIPPED = new Set(["script", "style", "noscript", "svg", "template", "iframe", "head"]);
// Page chrome rather than content; only skipped for the generic whole-page fallback.
const LANDMARKS = new Set(["nav", "footer", "aside"]);
const BLOCKS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);

export interface ExtractTextOptions {
  /** Also drop `nav` / `footer` / `aside`. Use for whole-page fallbacks. */
  readonly skipLandmarks?: boolean;
}

function isHidden(element: Element): boolean {
  if (element.hasAttribute("hidden")) return true;
  if (element.getAttribute("aria-hidden") === "true") return true;
  return /display\s*:\s*none/i.test(element.getAttribute("style") ?? "");
}

function walk(node: Node, out: string[], options: ExtractTextOptions): void {
  if (node.nodeType === TEXT_NODE) {
    // Collapse like HTML does; `\s` also covers &nbsp;.
    out.push((node.textContent ?? "").replace(/\s+/g, " "));
    return;
  }
  if (node.nodeType !== ELEMENT_NODE) return;

  const element = node as Element;
  const tag = element.localName.toLowerCase();
  if (ALWAYS_SKIPPED.has(tag)) return;
  if (options.skipLandmarks && LANDMARKS.has(tag)) return;
  if (isHidden(element)) return;

  if (tag === "br") {
    out.push("\n");
    return;
  }

  const isBlock = BLOCKS.has(tag);
  if (isBlock) out.push("\n");
  if (tag === "li") out.push("- ");
  for (const child of Array.from(element.childNodes)) walk(child, out, options);
  if (isBlock) out.push("\n");
}

/**
 * Readable text of an element. Own walker instead of `innerText`: it behaves the same in a
 * browser and in a test DOM, so the output is deterministic and testable.
 */
export function extractText(root: Element, options: ExtractTextOptions = {}): string {
  const out: string[] = [];
  for (const child of Array.from(root.childNodes)) walk(child, out, options);
  return normalizeText(out.join(""));
}

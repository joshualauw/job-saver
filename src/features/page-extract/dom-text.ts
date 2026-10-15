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

/** Tidies raw text: trims lines, drops empty runs (max one blank line), keeps bullets on one line. */
export function normalizeText(raw: string): string {
  const lines = raw
    .replace(/(^|\n)- [ \t]*\n+/g, "$1- ")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim());

  const kept: string[] = [];
  for (const line of lines) {
    if (line === "" && (kept.length === 0 || kept[kept.length - 1] === "")) continue;
    kept.push(line);
  }
  while (kept[kept.length - 1] === "") kept.pop();

  // Keep a bullet list tight: `<li><p>…</p></li>` would otherwise leave a blank line between items.
  return kept
    .filter((line, index) => {
      if (line !== "") return true;
      return !(kept[index - 1]?.startsWith("- ") && kept[index + 1]?.startsWith("- "));
    })
    .join("\n");
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

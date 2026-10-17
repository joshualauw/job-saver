import { describe, expect, it } from "vitest";

import { documentFromHtml } from "../../../tests/helpers/fixtures";

import { extractText } from "./dom-text";
import type { ExtractTextOptions } from "./dom-text";

function textOf(html: string, options?: ExtractTextOptions): string {
  const doc = documentFromHtml(`<body><div id="root">${html}</div></body>`, "https://example.com/");
  const root = doc.getElementById("root");
  if (!root) throw new Error("test document is missing #root");
  return extractText(root, options);
}

describe("extractText", () => {
  it("separates block elements with a blank line", () => {
    expect(textOf("<p>One</p><p>Two</p>")).toBe("One\n\nTwo");
  });

  it("keeps inline elements inline", () => {
    expect(textOf("<p>Use <strong>Next.js</strong>, then ship.</p>")).toBe("Use Next.js, then ship.");
  });

  it("turns <br> into a line break", () => {
    expect(textOf("<p>line one<br>line two</p>")).toBe("line one\nline two");
  });

  it("renders list items as tight bullets even when wrapped in <p>", () => {
    expect(textOf("<ul><li><p>First</p></li><li><p>Second</p></li><li>Third</li></ul>")).toBe(
      "- First\n- Second\n- Third",
    );
  });

  it("normalises &nbsp; and collapses whitespace", () => {
    expect(textOf("<p>Rp&nbsp;7.000.000</p>")).toBe("Rp 7.000.000");
    expect(textOf("<p>  a \n   b   </p>")).toBe("a b");
  });

  it("skips script, style, svg, template, noscript and iframe content", () => {
    const html =
      "<p>Keep</p><script>evil()</script><style>.a{}</style><svg><text>icon</text></svg>" +
      "<template><p>tpl</p></template><noscript>enable js</noscript><iframe>frame</iframe>";
    expect(textOf(html)).toBe("Keep");
  });

  it("skips hidden elements", () => {
    const html = '<p>Shown</p><p hidden>a</p><p aria-hidden="true">b</p><p style="display: none">c</p>';
    expect(textOf(html)).toBe("Shown");
  });

  it("keeps nav and footer unless landmarks are skipped", () => {
    const html = "<nav>Menu</nav><p>Body</p><footer>Legal</footer>";
    expect(textOf(html)).toBe("Menu\n\nBody\n\nLegal");
    expect(textOf(html, { skipLandmarks: true })).toBe("Body");
  });
});

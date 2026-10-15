import { describe, expect, it } from "vitest";

import type { PlatformDef } from "@/core/types";

import { documentFromHtml } from "../../../tests/helpers/fixtures";

import { buildPagePayload } from "./extract-page";
import { TRUNCATION_MARKER } from "./truncate";

const demo: PlatformDef = {
  id: "demo",
  name: "Demo",
  matchesHost: (hostname) => hostname === "jobs.demo.test",
  canonicalizeUrl: (url) => url,
  content: { facts: { Title: "h1", Pay: ".pay", Missing: ".nope" }, description: "#ad" },
};

const URL_ON_DEMO = "https://jobs.demo.test/job/7?utm_source=x";
const AD_HTML = `
  <body>
    <nav>Site menu</nav>
    <h1>Backend Engineer</h1>
    <span class="pay">Rp 8.000.000 per month</span>
    <div id="ad"><p>Build and run services for our platform team.</p></div>
    <footer>Legal</footer>
  </body>`;

function build(html: string, url: string, selection: string | null = null, maxChars = 12_000) {
  return buildPagePayload(documentFromHtml(html, url), { platforms: [demo], maxChars, selection });
}

describe("buildPagePayload", () => {
  it("reads facts and the description through the platform selectors", () => {
    const payload = build(AD_HTML, URL_ON_DEMO);
    expect(payload.url).toBe(URL_ON_DEMO);
    expect(payload.facts).toEqual({ Title: "Backend Engineer", Pay: "Rp 8.000.000 per month" });
    expect(payload.description).toBe("Build and run services for our platform team.");
    expect(payload.contentSource).toBe("platform");
    expect(payload.jsonLd).toEqual([]);
  });

  it("prefers a deliberate selection over the platform text but keeps the facts", () => {
    const selection = "  Only this part matters:   must know Postgres and TypeScript well.  ";
    const payload = build(AD_HTML, URL_ON_DEMO, selection);
    expect(payload.contentSource).toBe("selection");
    expect(payload.description).toBe("Only this part matters: must know Postgres and TypeScript well.");
    expect(payload.facts["Title"]).toBe("Backend Engineer");
  });

  it("ignores a short, accidental selection", () => {
    const payload = build(AD_HTML, URL_ON_DEMO, "Backend");
    expect(payload.contentSource).toBe("platform");
  });

  it("falls back to generic text when the description selector misses, keeping facts", () => {
    const html = AD_HTML.replace('id="ad"', 'id="renamed"');
    const payload = build(`<body><main>${html}</main></body>`, URL_ON_DEMO);
    expect(payload.contentSource).toBe("generic");
    expect(payload.facts["Pay"]).toBe("Rp 8.000.000 per month");
    expect(payload.description).toContain("Build and run services");
    expect(payload.description).not.toContain("Site menu");
    expect(payload.description).not.toContain("Legal");
  });

  it("uses generic page text with no facts for an unknown platform", () => {
    const html = "<body><nav>Menu</nav><main><h1>Dev</h1><p>Build things.</p></main></body>";
    const payload = build(html, "https://careers.example.com/42");
    expect(payload.contentSource).toBe("generic");
    expect(payload.facts).toEqual({});
    expect(payload.description).toBe("Dev\n\nBuild things.");
  });

  it("truncates the description to the budget", () => {
    const html = `<body><div id="ad"><p>${"Sentence goes here. ".repeat(100)}</p></div></body>`;
    const payload = build(html, URL_ON_DEMO, null, 200);
    expect(payload.description.length).toBeLessThanOrEqual(200);
    expect(payload.description.endsWith(TRUNCATION_MARKER)).toBe(true);
  });

  it("returns the page title and any JobPosting JSON-LD", () => {
    const posting = { "@type": "JobPosting", title: "Backend Engineer" };
    const html =
      `<html><head><title>Backend Engineer | Demo</title>` +
      `<script type="application/ld+json">${JSON.stringify(posting)}</script></head>` +
      `<body><div id="ad">Ad text</div></body></html>`;
    const payload = build(html, URL_ON_DEMO);
    expect(payload.title).toBe("Backend Engineer | Demo");
    expect(payload.jsonLd).toEqual([posting]);
  });
});

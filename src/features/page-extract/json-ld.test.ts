import { describe, expect, it } from "vitest";

import { documentFromHtml } from "../../../tests/helpers/fixtures";

import { readJobPostings } from "./json-ld";

function docWithJsonLd(...blocks: string[]): Document {
  const scripts = blocks.map((block) => `<script type="application/ld+json">${block}</script>`).join("");
  return documentFromHtml(`<html><head>${scripts}</head><body></body></html>`, "https://example.com/job/1");
}

describe("readJobPostings", () => {
  it("returns [] when the page has no JSON-LD", () => {
    expect(readJobPostings(documentFromHtml("<html><body></body></html>", "https://example.com/"))).toEqual([]);
  });

  it("finds a top-level JobPosting", () => {
    const posting = { "@type": "JobPosting", title: "Backend Engineer" };
    expect(readJobPostings(docWithJsonLd(JSON.stringify(posting)))).toEqual([posting]);
  });

  it("flattens arrays and @graph, dropping other types", () => {
    const posting = { "@type": "JobPosting", title: "A" };
    const graph = { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", url: "x" }, posting] };
    expect(readJobPostings(docWithJsonLd(JSON.stringify([graph])))).toEqual([posting]);
  });

  it("accepts an @type array that includes JobPosting", () => {
    const posting = { "@type": ["Thing", "JobPosting"], title: "B" };
    expect(readJobPostings(docWithJsonLd(JSON.stringify(posting)))).toEqual([posting]);
  });

  it("ignores malformed JSON while still reading valid blocks", () => {
    const posting = { "@type": "JobPosting", title: "C" };
    expect(readJobPostings(docWithJsonLd("{ not json", JSON.stringify(posting)))).toEqual([posting]);
  });
});

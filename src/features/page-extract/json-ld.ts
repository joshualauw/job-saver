import { z } from "zod";

const typedNode = z.looseObject({
  "@type": z.union([z.string(), z.array(z.string())]),
});

function collect(value: unknown, into: unknown[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, into);
    return;
  }
  if (typeof value !== "object" || value === null) return;

  const graph = (value as Record<string, unknown>)["@graph"];
  if (graph !== undefined) collect(graph, into);
  into.push(value);
}

function isJobPosting(node: unknown): boolean {
  const parsed = typedNode.safeParse(node);
  if (!parsed.success) return false;
  const type = parsed.data["@type"];
  return Array.isArray(type) ? type.includes("JobPosting") : type === "JobPosting";
}

/**
 * `schema.org/JobPosting` objects from the page's JSON-LD blocks (top level, arrays, and
 * `@graph`). Many job boards embed one; Jobstreet currently does not.
 */
export function readJobPostings(doc: Document): unknown[] {
  const nodes: unknown[] = [];
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      collect(JSON.parse(script.textContent ?? ""), nodes);
    } catch {
      // Third-party markup: a malformed block must not break extraction.
    }
  }
  return nodes.filter(isJobPosting);
}

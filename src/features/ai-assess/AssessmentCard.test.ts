import { ChakraProvider } from "@chakra-ui/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { system } from "@/theme/system";

import { AssessmentCard } from "./AssessmentCard";

function render(inputs: Record<string, string>): string {
  return renderToStaticMarkup(
    createElement(ChakraProvider, { value: system, children: createElement(AssessmentCard, { inputs }) }),
  );
}

describe("AssessmentCard", () => {
  it("shows the verdict label, one row per CV bullet and one row per preference", () => {
    const html = render({
      verdict: "very_high",
      cvFit: "Yes: Matches Node.js and Postgres\nNo: Needs 5 years, CV shows 2",
      preferenceFit: "Yes: Remote work\nNo: Salary above 10M",
    });

    expect(html).toContain("Very high");
    expect(html).toContain("Matches Node.js and Postgres");
    expect(html).toContain("Needs 5 years, CV shows 2");
    expect(html).toContain("Remote work");
    expect(html).toContain("Salary above 10M");
    expect(html).toContain("✓");
    expect(html).toContain("✗");
    expect(html).not.toContain("Yes: ");
  });

  it("names the two lists only when both are shown", () => {
    const both = render({ cvFit: "Yes: Node.js", preferenceFit: "Yes: Remote work" });
    expect(both).toContain(">CV<");
    expect(both).toContain(">Preferences<");

    const onlyCv = render({ cvFit: "Yes: Node.js" });
    expect(onlyCv).not.toContain(">CV<");
    expect(onlyCv).not.toContain(">Preferences<");
  });

  it("shows an older paragraph CV fit as one plain bullet", () => {
    const html = render({ cvFit: "Strong match on the backend stack." });
    expect(html).toContain("Strong match on the backend stack.");
    expect(html).toContain("•");
  });

  it("renders nothing when there is no assessment", () => {
    expect(render({})).not.toContain("Fit for you");
    expect(render({ verdict: "", cvFit: " ", preferenceFit: "" })).not.toContain("Fit for you");
  });

  it("works with only a verdict, or only preferences", () => {
    expect(render({ verdict: "low" })).toContain("Low");
    expect(render({ preferenceFit: "Yes: Remote work" })).toContain("Remote work");
  });

  it("does not render markup from the text", () => {
    const html = render({ verdict: "high", cvFit: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
  });
});

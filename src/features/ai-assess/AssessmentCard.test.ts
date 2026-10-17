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
  it("shows the verdict label, the CV fit and one row per preference", () => {
    const html = render({
      verdict: "very_high",
      cvFit: "Strong match on the backend stack.",
      preferenceFit: "Yes: Remote work\nNo: Salary above 10M\nNot stated: Four day week",
    });

    expect(html).toContain("Very high");
    expect(html).toContain("Strong match on the backend stack.");
    expect(html).toContain("Remote work");
    expect(html).toContain("Salary above 10M");
    expect(html).toContain("Four day week");
    expect(html).toContain("✓");
    expect(html).toContain("✗");
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

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
  it("shows one marked row per preference", () => {
    const html = render({ preferenceFit: "Yes: Remote work\nNo: Salary above 10M" });

    expect(html).toContain("Fit for you");
    expect(html).toContain("Remote work");
    expect(html).toContain("Salary above 10M");
    expect(html).toContain("✓");
    expect(html).toContain("✗");
    expect(html).not.toContain("Yes: ");
  });

  it("renders nothing when there is no assessment", () => {
    expect(render({})).not.toContain("Fit for you");
    expect(render({ preferenceFit: " " })).not.toContain("Fit for you");
  });

  it("shows a line without a known prefix as a plain bullet", () => {
    const html = render({ preferenceFit: "Not stated: Four day week" });
    expect(html).toContain("Not stated: Four day week");
    expect(html).toContain("•");
  });

  it("does not render markup from the text", () => {
    const html = render({ preferenceFit: "Yes: <script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
  });
});

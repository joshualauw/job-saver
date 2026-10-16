import { describe, expect, it } from "vitest";

import { parseHttpUrl, sitePattern, stripTrackingParams } from "./url";

describe("sitePattern", () => {
  it("covers the whole origin, ignoring path, query and port-less defaults", () => {
    expect(sitePattern("https://www.linkedin.com/jobs/view/4474155201/?trk=x")).toBe("https://www.linkedin.com/*");
    expect(sitePattern("http://localhost:3000/a")).toBe("http://localhost:3000/*");
  });

  it("is null for non-web URLs", () => {
    expect(sitePattern("chrome://extensions")).toBeNull();
    expect(sitePattern("garbage")).toBeNull();
  });
});

describe("parseHttpUrl", () => {
  it("accepts http and https", () => {
    expect(parseHttpUrl("https://example.com/a")?.hostname).toBe("example.com");
    expect(parseHttpUrl("http://example.com")?.protocol).toBe("http:");
  });

  it("rejects other protocols and garbage", () => {
    expect(parseHttpUrl("chrome://extensions")).toBeNull();
    expect(parseHttpUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpUrl("not a url")).toBeNull();
    expect(parseHttpUrl("")).toBeNull();
  });
});

describe("stripTrackingParams", () => {
  const clean = (raw: string) => stripTrackingParams(new URL(raw)).href;

  it("drops tracking params and the fragment", () => {
    expect(clean("https://example.com/job/1?utm_source=x&gclid=y&id=7#top")).toBe("https://example.com/job/1?id=7");
  });

  it("sorts remaining params so equal URLs compare equal", () => {
    expect(clean("https://example.com/j?b=2&a=1")).toBe("https://example.com/j?a=1&b=2");
  });

  it("removes a trailing slash from non-root paths only", () => {
    expect(clean("https://example.com/job/1/")).toBe("https://example.com/job/1");
    expect(clean("https://example.com/")).toBe("https://example.com/");
  });

  it("does not mutate the input URL", () => {
    const url = new URL("https://example.com/j?utm_source=x#frag");
    stripTrackingParams(url);
    expect(url.href).toBe("https://example.com/j?utm_source=x#frag");
  });
});

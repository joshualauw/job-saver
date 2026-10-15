import { describe, expect, it } from "vitest";

import { parseHttpUrl, stripTrackingParams } from "./url";

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

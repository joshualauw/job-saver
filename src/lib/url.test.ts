import { describe, expect, it } from "vitest";

import { parseHttpUrl } from "./url";

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

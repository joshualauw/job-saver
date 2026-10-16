import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError } from "@/core/errors";
import * as chrome from "@/lib/chrome";

import { createGoogleAuth } from "./google-auth";

vi.mock("@/lib/chrome", () => ({
  getAuthToken: vi.fn(),
  removeCachedAuthToken: vi.fn(),
}));

const getAuthToken = vi.mocked(chrome.getAuthToken);
const removeCachedAuthToken = vi.mocked(chrome.removeCachedAuthToken);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createGoogleAuth", () => {
  it("requests an interactive token and returns it", async () => {
    getAuthToken.mockResolvedValue("tok");
    await expect(createGoogleAuth().getToken()).resolves.toBe("tok");
    expect(getAuthToken).toHaveBeenCalledWith(true);
  });

  it("surfaces Chrome's reason in the AuthError, keeping the original as cause", async () => {
    const original = new Error("OAuth2 request failed: Service responded with error: 'bad client id'");
    getAuthToken.mockRejectedValue(original);

    const error = await createGoogleAuth()
      .getToken()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).message).toContain("bad client id");
    expect((error as AuthError).cause).toBe(original);
  });

  it("falls back to a generic message when Chrome gives no reason", async () => {
    getAuthToken.mockRejectedValue(undefined);
    await expect(createGoogleAuth().getToken()).rejects.toThrow(
      /Google sign-in failed\. Make sure Chrome is signed in/,
    );
  });

  it("caps very long reasons", async () => {
    getAuthToken.mockRejectedValue(new Error("x".repeat(1000)));
    const error = (await createGoogleAuth()
      .getToken()
      .catch((caught: unknown) => caught)) as AuthError;
    expect(error.message.length).toBeLessThan(400);
  });

  it("drops a cached token and ignores failures while doing so", async () => {
    removeCachedAuthToken.mockRejectedValue(new Error("already gone"));
    await expect(createGoogleAuth().dropToken("tok")).resolves.toBeUndefined();
    expect(removeCachedAuthToken).toHaveBeenCalledWith("tok");
  });
});

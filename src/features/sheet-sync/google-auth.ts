import { AuthError } from "@/core/errors";
import { getAuthToken, removeCachedAuthToken } from "@/lib/chrome";

export interface GoogleAuth {
  getToken(): Promise<string>;
  /** Drops a token Google rejected so the next `getToken` fetches a fresh one. */
  dropToken(token: string): Promise<void>;
}

/** Chrome's own explanation ("bad client id", "access_denied", ...). It never contains a token. */
function reasonOf(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
  return text.trim().slice(0, 200);
}

/**
 * Chrome-account OAuth via `chrome.identity`. Interactive on purpose: it is only reached from a
 * user action (Analyze / Save), and the consent prompt explains itself. Every failure (cancelled
 * consent, not signed in to Chrome, OAuth client misconfigured) becomes one `AuthError` that
 * carries Chrome's reason, because the cause decides the fix.
 */
export function createGoogleAuth(): GoogleAuth {
  return {
    async getToken() {
      try {
        return await getAuthToken(true);
      } catch (cause) {
        const reason = reasonOf(cause);
        throw new AuthError(
          `Google sign-in failed${reason ? ` (${reason})` : ""}. Make sure Chrome is signed in to your Google account, then try again.`,
          { cause },
        );
      }
    },
    async dropToken(token) {
      await removeCachedAuthToken(token).catch(() => undefined);
    },
  };
}

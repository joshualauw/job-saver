// Thin wrappers over chrome.* so callers stay mockable and pure modules never touch `chrome`.

export interface ActiveTab {
  readonly id: number;
  /** `null` when the extension has no permission to see the tab's URL. */
  readonly url: string | null;
}

export function openPanelOnActionClick(): Promise<void> {
  return chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

export async function getActiveTab(): Promise<ActiveTab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id === undefined) return null;
  return { id: tab.id, url: tab.url ?? null };
}

/**
 * Calls `onChange` with the active tab whenever the user switches tab or window, or the active
 * tab navigates (including in-page navigation). Returns the unsubscribe function.
 */
export function watchActiveTab(onChange: (tab: ActiveTab | null) => void): () => void {
  const notify = () => {
    void getActiveTab().then(onChange);
  };
  const onUpdated = (_tabId: number, info: { url?: string; status?: string }) => {
    if (info.url !== undefined || info.status === "complete") notify();
  };

  chrome.tabs.onActivated.addListener(notify);
  chrome.tabs.onUpdated.addListener(onUpdated);
  chrome.windows.onFocusChanged.addListener(notify);
  notify();

  return () => {
    chrome.tabs.onActivated.removeListener(notify);
    chrome.tabs.onUpdated.removeListener(onUpdated);
    chrome.windows.onFocusChanged.removeListener(notify);
  };
}

/**
 * Asks Chrome for standing access to a site. Must be called straight from a click handler, with
 * nothing awaited first, or Chrome refuses to show the prompt. Resolves `false` if declined.
 */
export function requestSiteAccess(pattern: string): Promise<boolean> {
  return chrome.permissions.request({ origins: [pattern] });
}

export async function storageGet(key: string): Promise<unknown> {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/** Session storage survives the panel closing but not the browser quitting. */
export async function sessionGet(key: string): Promise<unknown> {
  const result = await chrome.storage.session.get(key);
  return result[key];
}

export async function sessionSet(key: string, value: unknown): Promise<void> {
  await chrome.storage.session.set({ [key]: value });
}

/** Whether this build was made with a Google OAuth client ID (set from `.env.local`). */
export function hasOAuthClient(): boolean {
  return Boolean(chrome.runtime.getManifest().oauth2?.client_id);
}

/** Google OAuth token for the Chrome-signed-in account. Rejects if sign-in fails or is cancelled. */
export async function getAuthToken(interactive: boolean): Promise<string> {
  const { token } = await chrome.identity.getAuthToken({ interactive });
  if (!token) throw new Error("No Google auth token was returned");
  return token;
}

export async function removeCachedAuthToken(token: string): Promise<void> {
  await chrome.identity.removeCachedAuthToken({ token });
}

/** Runs a bundled script file in the tab and returns the script's return value. */
export async function executeScriptFile(tabId: number, file: string): Promise<unknown> {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
  return injection?.result;
}

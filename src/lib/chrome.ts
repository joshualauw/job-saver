// Thin wrappers over chrome.* so callers stay mockable and pure modules never touch `chrome`.

export function openPanelOnActionClick(): Promise<void> {
  return chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

const SELECTION_MENU_ID = "send-selection";

/** Adds the right-click item that sends highlighted text to the panel; replaces any earlier copy. */
export async function createSelectionMenu(title: string): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: SELECTION_MENU_ID, title, contexts: ["selection"] });
}

/** Calls `handler` with the highlighted text when the user picks the right-click item. */
export function onSelectionMenuClick(handler: (selection: string, tabId: number | undefined) => void): void {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === SELECTION_MENU_ID && info.selectionText) handler(info.selectionText, tab?.id);
  });
}

export function onExtensionInstalled(handler: () => void): void {
  chrome.runtime.onInstalled.addListener(handler);
}

/** Opens the side panel in a tab. Chrome only allows this straight from a user action. */
export function openSidePanel(tabId: number): Promise<void> {
  return chrome.sidePanel.open({ tabId });
}

/** Calls `onChange` with the new value whenever session storage changes under `key`. Returns the unsubscribe function. */
export function watchSessionValue(key: string, onChange: (value: unknown) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    const change = changes[key];
    if (area === "session" && change) onChange(change.newValue);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
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

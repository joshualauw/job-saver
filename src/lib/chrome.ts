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

/** Runs a bundled script file in the tab and returns the script's return value. */
export async function executeScriptFile(tabId: number, file: string): Promise<unknown> {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
  return injection?.result;
}

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

/** Runs a bundled script file in the tab and returns the script's return value. */
export async function executeScriptFile(tabId: number, file: string): Promise<unknown> {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
  return injection?.result;
}

// Thin wrappers over chrome.* so callers stay mockable and pure modules never touch `chrome`.

export function openPanelOnActionClick(): Promise<void> {
  return chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

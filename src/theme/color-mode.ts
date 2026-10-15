const DARK_QUERY = "(prefers-color-scheme: dark)";

// Chakra v3 keys its dark conditions off a `.dark` class on an ancestor, so mirror the
// system preference onto <html> instead of pulling in a color-mode package.
export function syncColorModeWithSystem(): void {
  const media = window.matchMedia(DARK_QUERY);
  const apply = (isDark: boolean) => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  };

  apply(media.matches);
  media.addEventListener("change", (event) => apply(event.matches));
}

export type ThemePreference = "light" | "dark";

const THEME_STORAGE_KEY = "framescope-theme";

// Only used as a fallback when localStorage is unavailable (e.g. blocked in
// a privacy mode) — the normal path always has an explicit stored value,
// written either by the inline init script in layout.tsx on first visit or
// by applyTheme() once the user picks a choice in Settings.
function resolveSystemPreference(): ThemePreference {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : resolveSystemPreference();
}

export function applyTheme(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  document.documentElement.setAttribute("data-theme", preference);
}

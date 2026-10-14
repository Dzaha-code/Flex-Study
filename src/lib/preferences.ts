import type { Locale, Settings, ThemePreference } from "@/domain/types";

/**
 * Preferences are mirrored into `localStorage` for one reason: the theme has to
 * be applied before the first paint, and IndexedDB is asynchronous. IndexedDB
 * remains the source of truth — this mirror is read-only sugar for boot.
 */
export const THEME_STORAGE_KEY = "flexstudy.theme";
export const LOCALE_STORAGE_KEY = "flexstudy.locale";

export function mirrorPreferences(settings: Pick<Settings, "theme" | "locale">): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
  localStorage.setItem(LOCALE_STORAGE_KEY, settings.locale);
}

export function readMirroredTheme(): ThemePreference {
  if (typeof localStorage === "undefined") return "system";
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function readMirroredLocale(): Locale | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(LOCALE_STORAGE_KEY);
  return value === "id" || value === "en" ? value : null;
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): "light" | "dark" {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

export function applyThemeClass(resolved: "light" | "dark"): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Runs inline in `<head>` before paint. Kept tiny and dependency-free so no
 * flash of the wrong theme can happen.
 */
export const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((stored === 'system' || !stored) && prefersDark);
    var root = document.documentElement;
    if (dark) root.classList.add('dark');
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (error) {}
})();
`.trim();

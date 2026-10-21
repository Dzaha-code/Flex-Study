import type {
  AnimationPreference,
  IntroPreference,
  Locale,
  Settings,
  ThemePreference,
} from "@/domain/types";

/**
 * Preferences are mirrored into `localStorage` for one reason: the theme has to
 * be applied before the first paint, and IndexedDB is asynchronous. IndexedDB
 * remains the source of truth — this mirror is read-only sugar for boot.
 */
export const THEME_STORAGE_KEY = "flexstudy.theme";
export const LOCALE_STORAGE_KEY = "flexstudy.locale";
/**
 * The intro preference is mirrored for the harder version of the same reason:
 * whether to hold the app behind the animation must be decided *before* the
 * database answers, or the intro plays over a screen the user can already read.
 */
export const INTRO_STORAGE_KEY = "flexstudy.intro";
/**
 * Mirrored for the same class of reason as `intro`: the motion attribute has to
 * be on `<html>` before the first paint, or a device that asked for less motion
 * gets one animated frame before the stylesheet catches up.
 */
export const ANIMATION_STORAGE_KEY = "flexstudy.animation";
/**
 * Whether the language has ever been chosen on this device. The mirror alone is
 * not enough: an existing install already has one, and the first conversation
 * with Stabilo must still be preceded by an explicit choice.
 */
export const LANGUAGE_CHOSEN_KEY = "flexstudy.langChosen.v1";

export function readLanguageChosen(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(LANGUAGE_CHOSEN_KEY) === "1";
}

export function markLanguageChosen(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LANGUAGE_CHOSEN_KEY, "1");
}

export function mirrorPreferences(
  settings: Pick<Settings, "theme" | "locale" | "intro" | "animation">,
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
  localStorage.setItem(LOCALE_STORAGE_KEY, settings.locale);
  localStorage.setItem(INTRO_STORAGE_KEY, settings.intro);
  localStorage.setItem(ANIMATION_STORAGE_KEY, settings.animation);
}

/** `null` means "never chosen", which the caller reads as `system`. */
export function readMirroredAnimation(): AnimationPreference | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(ANIMATION_STORAGE_KEY);
  return value === "system" || value === "full" || value === "reduced" ? value : null;
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

/** `null` means "never configured", which is not the same as a stored `once`. */
export function readMirroredIntro(): IntroPreference | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(INTRO_STORAGE_KEY);
  return value === "once" || value === "always" || value === "off" ? value : null;
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): "light" | "dark" {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

/**
 * The theme is carried by a `data-theme` attribute, not a class (DESIGN.md §3
 * follows the reference prototype). Three states resolve to two values:
 * `system` follows the media query in CSS, while an explicit choice pins the
 * attribute so it also overrides `prefers-color-scheme: dark`.
 */
export function applyThemeAttribute(resolved: "light" | "dark"): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

/**
 * Runs inline in `<head>` before paint. Kept tiny and dependency-free so no
 * flash of the wrong theme can happen.
 *
 * Sets the resolved value rather than `system`: that keeps the Tailwind `dark`
 * variant and the CSS custom properties in agreement from the first frame,
 * instead of relying on the media query alone.
 */
export const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((stored === 'system' || !stored) && prefersDark);
    var root = document.documentElement;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.style.colorScheme = dark ? 'dark' : 'light';
    // Motion is the same class of decision as the theme: it has to be settled
    // before paint. "system" writes nothing and lets the media query rule.
    var animation = localStorage.getItem('${ANIMATION_STORAGE_KEY}');
    if (animation === 'full' || animation === 'reduced') {
      root.setAttribute('data-motion', animation === 'full' ? 'full' : 'reduced');
    }
  } catch (error) {}
})();
`.trim();

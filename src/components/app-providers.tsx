"use client";

import { useEffect, type ReactNode } from "react";
import { useAppStore } from "@/data/store";
import { applyThemeClass, resolveTheme, systemPrefersDark } from "@/lib/preferences";
import { ToastProvider } from "./ui/toast";

/**
 * Keeps the document in step with the user's preferences. The theme is also
 * applied pre-paint by an inline script; this component owns everything after
 * hydration, including live changes to the system preference.
 */
function ThemeSync() {
  const theme = useAppStore((state) => state.settings.theme);

  useEffect(() => {
    const apply = () => applyThemeClass(resolveTheme(theme, systemPrefersDark()));
    apply();

    if (theme !== "system" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return null;
}

/** `<html lang>` follows the chosen language (brief section 9). */
function DocumentLangSync() {
  const locale = useAppStore((state) => state.settings.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ThemeSync />
      <DocumentLangSync />
      {children}
    </ToastProvider>
  );
}

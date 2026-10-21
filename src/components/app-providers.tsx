"use client";

import { useEffect, type ReactNode } from "react";
import { useAppStore } from "@/data/store";
import { applyMotionAttribute } from "@/lib/motion";
import { applyThemeAttribute, resolveTheme, systemPrefersDark } from "@/lib/preferences";
import { ToastProvider } from "./ui/toast";

/**
 * Keeps the document in step with the user's preferences. The theme is also
 * applied pre-paint by an inline script; this component owns everything after
 * hydration, including live changes to the system preference.
 */
function ThemeSync() {
  const theme = useAppStore((state) => state.settings.theme);

  useEffect(() => {
    const apply = () => applyThemeAttribute(resolveTheme(theme, systemPrefersDark()));
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

/**
 * The motion preference lives on `<html>` so both stylesheets can read it: the
 * global guard in globals.css and Stabilo's own in stabilo.css. `system` removes
 * the attribute rather than writing a third value, so the media query stays the
 * only thing in charge; the inline bootstrap script also sets it pre-paint, and
 * this keeps it true after hydration and on every change.
 */
function MotionSync() {
  const animation = useAppStore((state) => state.settings.animation);

  useEffect(() => {
    applyMotionAttribute(animation);
  }, [animation]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ThemeSync />
      <DocumentLangSync />
      <MotionSync />
      {children}
    </ToastProvider>
  );
}

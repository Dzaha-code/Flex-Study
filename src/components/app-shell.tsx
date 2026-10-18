"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useAppStore } from "@/data/store";
import { GuidedTour } from "@/features/tour/guided-tour";
import { startTour } from "@/features/tour/tour-store";
import type { ContentWidth } from "@/domain/types";
import { useI18n, type MessageKey } from "@/i18n";
import {
  isFullscreen,
  setFullscreen,
  subscribeFullscreen,
} from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { resolveContentWidth, useWindowMaximised } from "@/lib/viewport";
import {
  IconBook,
  IconCalendar,
  IconCollapse,
  IconExpand,
  IconNote,
  IconSettings,
  IconSun,
  IconWidth,
} from "./ui/icons";
import { StorageNotice } from "./storage-notice";

interface NavItem {
  href: string;
  labelKey: MessageKey;
  Icon: (props: { width?: number; height?: number }) => ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.today", Icon: IconSun },
  { href: "/week", labelKey: "nav.week", Icon: IconCalendar },
  { href: "/journal", labelKey: "nav.journal", Icon: IconNote },
  { href: "/guide", labelKey: "nav.guide", Icon: IconBook },
  { href: "/settings", labelKey: "nav.settings", Icon: IconSettings },
];

/**
 * How much of a wide window the column may use. `wide` is the default because a
 * maximised laptop screen left most of the right half empty before.
 *
 * A maximised window skips the preference entirely and uses `full`: a window
 * that already fills the screen should not leave a band of dead space on the
 * right, and making the user flip this control after every maximise is the
 * manual step this is meant to remove.
 */
const WIDTH_CLASS: Record<ContentWidth, string> = {
  comfortable: "max-w-6xl",
  wide: "max-w-[1600px]",
  full: "max-w-none",
};

const WIDTH_LABEL: Record<ContentWidth, MessageKey> = {
  comfortable: "layout.width.comfortable",
  wide: "layout.width.wide",
  full: "layout.width.full",
};

const WIDTH_ORDER: ContentWidth[] = ["comfortable", "wide", "full"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Stable reference: an inline function here re-renders on every pass. */
const notFullscreen = () => false;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const contentWidth = useAppStore((state) => state.settings.contentWidth);
  const tourCompleted = useAppStore((state) => state.settings.tourCompleted);
  const stabiloEnabled = useAppStore((state) => state.stabilo.enabled);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const fullscreen = useSyncExternalStore(subscribeFullscreen, isFullscreen, notFullscreen);
  const maximised = useWindowMaximised();
  const effectiveWidth = resolveContentWidth(contentWidth, maximised);
  const autoStarted = useRef(false);

  // The tab title follows the interface language rather than being frozen at
  // build time in one language.
  useEffect(() => {
    const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));
    document.title = current ? `${t(current.labelKey)} · ${t("app.name")}` : t("app.name");
  }, [pathname, t]);

  /**
   * The tour introduces the Today screen, so it only starts there, once, and
   * only after onboarding has already given the user something to look at.
   *
   * It also never starts while the character is enabled: she is the presenter
   * of this tour, and letting both open was the collision — two scrims, two
   * spotlights, and Enter advancing both cards at once. When she is switched
   * off, or her artwork fails to load, this is the fallback and runs as before.
   */
  useEffect(() => {
    if (tourCompleted || autoStarted.current || stabiloEnabled) return;
    if (pathname !== "/") return;
    autoStarted.current = true;
    const timer = window.setTimeout(startTour, 700);
    return () => window.clearTimeout(timer);
  }, [tourCompleted, stabiloEnabled, pathname]);

  function cycleWidth() {
    const next = WIDTH_ORDER[(WIDTH_ORDER.indexOf(contentWidth) + 1) % WIDTH_ORDER.length];
    void updateSettings({ contentWidth: next });
  }

  const controlClass =
    "flex min-h-11 items-center gap-3 rounded-ctl px-3 text-meta text-ink-muted transition-colors hover:bg-accent-surface/60 hover:text-ink";

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:border focus:border-accent focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-meta"
      >
        {t("app.skipToContent")}
      </a>

      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col lg:flex-row lg:gap-8 lg:px-6",
          WIDTH_CLASS[effectiveWidth],
        )}
      >
        <nav
          aria-label={t("nav.label")}
          data-print-hide
          data-tour="nav"
          className={cn(
            // Phones: a thumb-reachable tab bar that always shows all areas.
            "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)]",
            "lg:sticky lg:bottom-auto lg:top-0 lg:flex lg:h-dvh lg:w-56 lg:shrink-0 lg:flex-col lg:border-r lg:border-t-0 lg:pb-0 lg:pt-6",
          )}
        >
          <p className="hidden px-5 pb-4 text-body font-semibold lg:block">{t("app.name")}</p>
          <ul className="grid grid-cols-5 lg:flex lg:flex-col lg:gap-1 lg:px-2">
            {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-label transition-colors lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-control lg:px-3 lg:text-meta",
                      active
                        ? "text-accent lg:bg-accent-surface lg:font-medium"
                        : "text-ink-muted hover:text-ink lg:hover:bg-accent-surface/60",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-6 items-center justify-center rounded-[6px] lg:size-5",
                        active && "bg-accent-surface text-accent lg:bg-transparent",
                      )}
                    >
                      <Icon width={20} height={20} />
                    </span>
                    <span>{t(labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* View controls. Width matters most on a large screen, so they stay
              out of the phone tab bar rather than replacing a nav item. */}
          <div data-print-hide className="mt-auto hidden flex-col gap-1 px-2 pb-6 pt-4 lg:flex">
            <p className="px-3 pb-1 text-caption font-medium text-mute">{t("layout.view")}</p>
            {/* While the window fills the screen the column is already full, so
                cycling here would change a preference the user cannot see take
                effect. It stays readable and stops taking taps instead. */}
            <button
              type="button"
              onClick={cycleWidth}
              disabled={maximised}
              title={maximised ? t("layout.widthAutoHint") : undefined}
              className={cn(controlClass, maximised && "cursor-default opacity-60 hover:bg-transparent")}
            >
              <IconWidth width={18} height={18} />
              <span className="flex flex-col items-start">
                <span>{t("layout.width")}</span>
                <span className="text-caption text-mute">
                  {maximised ? t("layout.widthAuto") : t(WIDTH_LABEL[contentWidth])}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => void setFullscreen(!fullscreen)}
              aria-pressed={fullscreen}
              className={controlClass}
            >
              {fullscreen ? (
                <IconCollapse width={18} height={18} />
              ) : (
                <IconExpand width={18} height={18} />
              )}
              <span>{fullscreen ? t("layout.exitFullscreen") : t("layout.fullscreen")}</span>
            </button>
          </div>
        </nav>

        <main
          id="main"
          className="min-w-0 flex-1 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-5 lg:px-0 lg:pb-12 lg:pt-8"
        >
          <StorageNotice />
          {children}
        </main>
      </div>

      <GuidedTour />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { IconCalendar, IconNote, IconSettings, IconSun } from "./ui/icons";
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
  { href: "/settings", labelKey: "nav.settings", Icon: IconSettings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  // The tab title follows the interface language rather than being frozen at
  // build time in one language.
  useEffect(() => {
    const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));
    document.title = current ? `${t(current.labelKey)} · ${t("app.name")}` : t("app.name");
  }, [pathname, t]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:border focus:border-accent focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-meta"
      >
        {t("app.skipToContent")}
      </a>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row lg:gap-8 lg:px-6">
        <nav
          aria-label={t("nav.label")}
          data-print-hide
          className={cn(
            // Phones: a thumb-reachable tab bar that always shows all four areas.
            "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)]",
            "lg:sticky lg:bottom-auto lg:top-0 lg:h-dvh lg:w-56 lg:shrink-0 lg:border-r lg:border-t-0 lg:pb-0 lg:pt-6",
          )}
        >
          <p className="hidden px-3 pb-4 text-body font-semibold lg:block">{t("app.name")}</p>
          <ul className="grid grid-cols-4 lg:flex lg:flex-col lg:gap-1 lg:px-2">
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
        </nav>

        <main
          id="main"
          className="min-w-0 flex-1 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-5 lg:px-0 lg:pb-12 lg:pt-8"
        >
          <StorageNotice />
          {children}
        </main>
      </div>
    </div>
  );
}

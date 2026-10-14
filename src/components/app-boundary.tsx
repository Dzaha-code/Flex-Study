"use client";

import { useEffect, type ReactNode } from "react";
import { useAppStore } from "@/data/store";
import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";
import { useI18n } from "@/i18n";
import { useMounted } from "@/lib/use-mounted";
import { AppShell } from "./app-shell";
import { Button } from "./ui/button";
import { IconWarning } from "./ui/icons";

function SkeletonLine({ width }: { width: string }) {
  return <div className="h-4 animate-pulse rounded-full bg-line" style={{ width }} />;
}

/**
 * The static shell. It deliberately renders this placeholder on the server and
 * on the first client render, so the prerendered HTML can never disagree with
 * hydration. Real content appears once IndexedDB has answered.
 */
function BootScreen() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
      <div className="hidden w-56 shrink-0 flex-col gap-3 lg:flex">
        <SkeletonLine width="8rem" />
        <SkeletonLine width="6rem" />
        <SkeletonLine width="7rem" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <SkeletonLine width="14rem" />
        <SkeletonLine width="20rem" />
        <div className="h-2 w-full animate-pulse rounded-full bg-line" />
        <div className="flex flex-col gap-3 pt-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-panel border border-line bg-surface-raised"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen() {
  const { t } = useI18n();
  const hydrate = useAppStore((state) => state.hydrate);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-16">
      <div className="surface-panel flex flex-col gap-3 p-5">
        <h1 className="flex items-center gap-2 text-title">
          <IconWarning className="text-danger" />
          {t("error.title")}
        </h1>
        <p className="text-meta text-ink-muted">{t("error.hydrate")}</p>
        <div>
          <Button onClick={() => void hydrate()}>{t("error.retry")}</Button>
        </div>
      </div>
    </div>
  );
}

export function AppBoundary({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const status = useAppStore((state) => state.status);
  const onboardingCompleted = useAppStore((state) => state.settings.onboardingCompleted);
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    if (mounted) void hydrate();
  }, [mounted, hydrate]);

  if (!mounted || status === "loading") return <BootScreen />;
  if (status === "error") return <ErrorScreen />;
  if (!onboardingCompleted) return <OnboardingScreen />;

  return <AppShell>{children}</AppShell>;
}

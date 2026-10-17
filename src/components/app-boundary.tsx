"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAppStore } from "@/data/store";
import { IntroGate } from "@/features/intro/IntroGate";
import { LanguageGate } from "@/features/language/language-gate";
import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";
import { StabiloHost } from "@/features/stabilo/StabiloHost";
import { useI18n } from "@/i18n";
import { readMirroredLocale } from "@/lib/preferences";
import { useMounted } from "@/lib/use-mounted";
import { AppShell } from "./app-shell";
import { Button } from "./ui/button";
import { IconWarning } from "./ui/icons";

/** The value is read once per render; nothing external can change it mid-session. */
function subscribeToNothing(): () => void {
  return () => {};
}

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

  /**
   * `null` while the answer is unknown. A stored choice means this is not the
   * first launch, so the language screen never appears again.
   *
   * Read through `useSyncExternalStore` rather than an effect: the server and
   * the first client render both answer `null`, and the real value only arrives
   * after mount, which is exactly the hydration-safe shape this needs.
   */
  const storedLocaleChoice = useSyncExternalStore(
    subscribeToNothing,
    () => readMirroredLocale() !== null,
    () => null,
  );
  const [forcedLocale, setForcedLocale] = useState(false);
  const localeChosen = forcedLocale ? true : storedLocaleChoice;

  useEffect(() => {
    if (mounted) void hydrate();
  }, [mounted, hydrate]);

  const handleLocaleDone = useCallback(() => setForcedLocale(true), []);

  let content: ReactNode;
  if (!mounted || status === "loading") content = <BootScreen />;
  else if (status === "error") content = <ErrorScreen />;
  else if (!onboardingCompleted) content = <OnboardingScreen />;
  else content = <AppShell>{children}</AppShell>;

  // The language screen comes before everything, including the intro: the tour
  // script is written per language, so it cannot be spoken until this is known.
  if (mounted && localeChosen === false) {
    return <LanguageGate onDone={handleLocaleDone} />;
  }

  // The first-run intro sits above whatever is underneath — including the boot
  // skeleton — so it masks the load instead of adding to it.
  return (
    <>
      <IntroGate>{content}</IntroGate>
      {/* Outside the gate on purpose: it reads the intro's own holding flag and
          waits, rather than starting to talk behind the animation. */}
      <StabiloHost />
    </>
  );
}

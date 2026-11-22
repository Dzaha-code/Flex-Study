"use client";

import { useEffect, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { IconClose, IconDownload } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/surface";
import { useI18n } from "@/i18n";
import { renderMarkdown } from "@/lib/markdown";
import { useUpdateStore } from "./update-store";

const DISMISSED_KEY = "fs.update.dismissed";
/** First check a few seconds after launch, so it never competes with boot. */
const FIRST_CHECK_MS = 5_000;
/** Then every six hours for an app that stays open all week. */
const RECHECK_MS = 6 * 60 * 60 * 1000;

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/**
 * Checks for a new version in the background and says so once, at the top of
 * the app. "Nanti" hides the banner for that version only — the next release
 * asks again, and Settings can always open the sheet by hand.
 */
export function UpdateBanner() {
  const status = useUpdateStore((state) => state.status);
  const update = useUpdateStore((state) => state.update);
  const openSheet = useUpdateStore((state) => state.openSheet);
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState<string | null>(readDismissed);

  useEffect(() => {
    const store = useUpdateStore.getState();
    let interval = 0;
    const first = window.setTimeout(async () => {
      await store.init();
      await useUpdateStore.getState().check({ silent: true });
      interval = window.setInterval(
        () => void useUpdateStore.getState().check({ silent: true }),
        RECHECK_MS,
      );
    }, FIRST_CHECK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  if (status !== "available" || !update || dismissed === update.version) return null;

  return (
    <div
      role="status"
      data-print-hide
      className="mb-4 flex flex-wrap items-center gap-3 rounded-panel border border-line-strong bg-raised p-3"
    >
      <IconDownload className="shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-meta text-ink">
        {t("update.banner", { version: update.version })}
      </p>
      <Button size="sm" onClick={openSheet}>
        {t("update.view")}
      </Button>
      <IconButton
        label={t("update.later")}
        onClick={() => {
          try {
            localStorage.setItem(DISMISSED_KEY, update.version);
          } catch {
            // Storage blocked: it just shows again next launch.
          }
          setDismissed(update.version);
        }}
      >
        <IconClose />
      </IconButton>
    </div>
  );
}

/** The detail sheet: what changed, and the one button that installs it. */
export function UpdateSheet() {
  const open = useUpdateStore((state) => state.sheetOpen);
  const close = useUpdateStore((state) => state.closeSheet);
  const status = useUpdateStore((state) => state.status);
  const update = useUpdateStore((state) => state.update);
  const progress = useUpdateStore((state) => state.progress);
  const error = useUpdateStore((state) => state.error);
  const install = useUpdateStore((state) => state.install);
  const { t } = useI18n();

  const busy = status === "downloading" || status === "restarting";

  const message =
    status === "downloading"
      ? progress === null
        ? t("update.downloading")
        : t("update.downloadingPercent", { percent: progress })
      : status === "restarting"
        ? t("update.restarting")
        : status === "installer-opened"
          ? t("update.installerOpened")
          : status === "needs-permission"
            ? t("update.needsPermission")
            : status === "error"
              ? t("update.failed", { reason: error ?? "?" })
              : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) close();
      }}
      title={update ? t("update.title", { version: update.version }) : t("update.titleNone")}
      description={update ? t("update.current", { version: update.currentVersion }) : undefined}
      footer={
        update ? (
          <>
            <Button variant="ghost" onClick={close} disabled={busy}>
              {t("update.later")}
            </Button>
            <Button
              onClick={() => void install()}
              disabled={busy}
            >
              <IconDownload />
              {status === "needs-permission" || status === "error" || status === "installer-opened"
                ? t("update.retry")
                : t("update.install")}
            </Button>
          </>
        ) : undefined
      }
    >
      {update?.notes ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-label font-medium text-ink-muted">{t("update.notes")}</span>
          {/* Release notes are written in Markdown (docs/releases/v<version>.md);
              the same small renderer the block notes use draws the lists and bold. */}
          <div className="flex max-h-[40dvh] flex-col gap-2 overflow-y-auto rounded-panel border border-line bg-surface p-3 text-meta text-ink">
            {renderMarkdown(update.notes)}
          </div>
        </div>
      ) : null}

      {status === "downloading" ? (
        <ProgressBar value={(progress ?? 0) / 100} label={message ?? ""} />
      ) : null}
      {message ? (
        <p className={status === "error" ? "text-meta text-danger" : "text-meta text-ink-muted"}>
          {message}
        </p>
      ) : null}
    </Sheet>
  );
}

/**
 * The Settings row: the installed version, a manual check, and the way back
 * into the sheet once something was found. Hidden in the browser, where there
 * is nothing to install.
 */
export function UpdateSettingsPanel() {
  const supported = useUpdateStore((state) => state.supported);
  const currentVersion = useUpdateStore((state) => state.currentVersion);
  const status = useUpdateStore((state) => state.status);
  const update = useUpdateStore((state) => state.update);
  const check = useUpdateStore((state) => state.check);
  const openSheet = useUpdateStore((state) => state.openSheet);
  const init = useUpdateStore((state) => state.init);
  const { t } = useI18n();

  // The banner initialises the store a few seconds after launch; Settings may
  // be opened sooner than that.
  useEffect(() => {
    if (!supported) void init();
  }, [supported, init]);

  if (!supported) return null;

  const line =
    status === "checking"
      ? t("update.checking")
      : status === "up-to-date"
        ? t("update.upToDate")
        : status === "available" && update
          ? t("update.banner", { version: update.version })
          : status === "error"
            ? t("update.checkFailed")
            : null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-meta text-ink">
        {t("update.installed", { version: currentVersion ?? "?" })}
      </p>
      {line ? <p className="text-meta text-ink-muted">{line}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={status === "checking" || status === "downloading"}
          onClick={() => void check()}
        >
          {t("update.check")}
        </Button>
        {update ? (
          <Button size="sm" onClick={openSheet}>
            <IconDownload />
            {t("update.view")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

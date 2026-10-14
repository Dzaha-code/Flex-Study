"use client";

import { useAppStore } from "@/data/store";
import { useI18n } from "@/i18n";
import { downloadTextFile } from "@/lib/download";
import { Button, IconButton } from "./ui/button";
import { IconClose, IconWarning } from "./ui/icons";
import { suggestExportFileName } from "@/data/workspace-io";

/**
 * The honest failure path: if a write did not land, say so and offer a way out
 * (an export) rather than pretending everything is fine.
 */
export function StorageNotice() {
  const notice = useAppStore((state) => state.storageNotice);
  const dismiss = useAppStore((state) => state.dismissStorageNotice);
  const exportWorkspace = useAppStore((state) => state.exportWorkspace);
  const { t } = useI18n();

  if (!notice) return null;

  const message =
    notice === "quota"
      ? t("error.quota")
      : notice === "unavailable"
        ? t("error.unavailable")
        : t("error.unknown");

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-panel border border-warn bg-warn-surface p-3 text-warn"
    >
      <IconWarning className="shrink-0" />
      <p className="min-w-0 flex-1 text-meta">{message}</p>
      {notice === "quota" ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const now = Date.now();
            downloadTextFile(suggestExportFileName(now), exportWorkspace());
          }}
        >
          {t("error.exportNow")}
        </Button>
      ) : null}
      <IconButton label={t("error.dismiss")} onClick={dismiss}>
        <IconClose />
      </IconButton>
    </div>
  );
}

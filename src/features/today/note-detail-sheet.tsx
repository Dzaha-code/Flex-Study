"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { CategoryTag } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import type { BlockInstance } from "@/domain/types";
import { minuteOfDayFromEpoch, toISODate } from "@/domain/time";
import { useI18n } from "@/i18n";
import { renderMarkdown } from "@/lib/markdown";

/**
 * A block note, read somewhere other than the timer it was written in.
 *
 * The note outlives the session that produced it — the timer is closed by the
 * time the line is worth rereading — so this is the reading surface, with the
 * three ways back into the note: change it, take a copy of it, or open the
 * block it belongs to. `onEdit` and `onOpenBlock` belong to the host screen:
 * both swap this sheet for another one, and two stacked sheets would fight
 * over the same z-index.
 */
export function NoteDetailSheet({
  instance,
  onClose,
  onEdit,
  onOpenBlock,
}: {
  instance: BlockInstance;
  onClose: () => void;
  /** Opens the note editor for this block. */
  onEdit: (instance: BlockInstance) => void;
  /** Opens the block itself (its own sheet on the host screen). */
  onOpenBlock: (instance: BlockInstance) => void;
}) {
  const stored = useAppStore((state) =>
    state.instances.find((candidate) => candidate.id === instance.id),
  );
  const categories = useAppStore((state) => state.categories);
  const current = stored ?? instance;
  const { t, formatDateShort, formatMinutes, formatClockValue } = useI18n();
  const category = categories.find((candidate) => candidate.id === current.categoryId);

  async function copyNote() {
    const text = current.note;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Webviews can refuse the async clipboard (a denied permission, or no
      // secure context at all). The old select-and-copy still answers, so a
      // refused promise is a fallback's cue, not a dead end.
      try {
        const field = document.createElement("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        ok = document.execCommand("copy");
        document.body.removeChild(field);
      } catch {
        ok = false;
      }
    }
    toastManager.add({
      title: ok ? t("journal.notes.copied") : t("journal.notes.copyFailed"),
      timeout: 3_000,
    });
  }

  const updatedMs = current.noteUpdatedAt ? Date.parse(current.noteUpdatedAt) : null;

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={current.title}
      description={`${formatDateShort(current.date)} · ${formatMinutes(current.durationMin)}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenBlock(current)}>
            {t("journal.notes.openBlock")}
          </Button>
          <Button variant="secondary" onClick={() => void copyNote()}>
            {t("journal.notes.copy")}
          </Button>
          <Button onClick={() => onEdit(current)}>{t("common.edit")}</Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        {category ? <CategoryTag name={category.name} icon={category.icon} /> : null}
        {updatedMs !== null ? (
          <span className="text-caption text-mute">
            {t("journal.notes.updated", {
              // formatDateShort takes a calendar day, not a timestamp:
              // fromISODate splits on "-", so a full ISO instant would produce
              // a NaN day and an Invalid time value crash.
              when: `${formatDateShort(toISODate(new Date(updatedMs)))} · ${formatClockValue(minuteOfDayFromEpoch(updatedMs))}`,
            })}
          </span>
        ) : null}
      </div>
      <div className="text-body leading-relaxed text-ink">{renderMarkdown(current.note)}</div>
    </Sheet>
  );
}

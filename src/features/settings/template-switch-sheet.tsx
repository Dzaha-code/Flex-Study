"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/surface";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import { addDays, planTemplateSwitch, todayISO, weekdayIndex } from "@/domain";
import type { ISODate } from "@/domain/types";
import { useI18n } from "@/i18n";

/**
 * The confirmation for every template application (updateBrief.md §3.5).
 *
 * The old flow was one warning and a yes/no: switch first, explain later, no
 * way back — which is also why "Hari ini" appeared not to change. This sheet
 * shows the three decisions the brief asks for before anything happens:
 *
 * 1. **When it starts** — today (default), tomorrow, or next Monday.
 * 2. **What it will do** — counts computed by the same `planTemplateSwitch`
 *    the apply consumes, so the preview cannot drift from reality.
 * 3. **That it can be undone** — the caller raises the ten-second undo toast
 *    from the event the apply records.
 *
 * Shared by the catalog list and the saved templates list, so both paths get
 * identical safety rules; only who resolves the id differs.
 */

/** Always strictly after today: "next Monday", never "this Monday". */
function nextMondayAfter(from: ISODate): ISODate {
  const days = (1 - weekdayIndex(from) + 7) % 7 || 7;
  return addDays(from, days);
}

type StartChoice = "today" | "tomorrow" | "monday";

export interface TemplateSwitchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The template being applied, named in the sheet. */
  templateName: string;
  /** The caller applies (the id lives in its own state) and raises the toast. */
  onConfirm: (startDate: ISODate) => void;
}

export function TemplateSwitchSheet({
  open,
  onOpenChange,
  templateName,
  onConfirm,
}: TemplateSwitchSheetProps) {
  const instances = useAppStore((state) => state.instances);
  const { t } = useI18n();
  const [start, setStart] = useState<StartChoice>("today");
  /**
   * Read once per mount, exactly like TodayScreen holds its own date: a day is
   * a snapshot, and re-reading the clock on every render would make the
   * preview jump under the cursor at midnight.
   */
  const [today] = useState(() => todayISO(Date.now()));
  const startDate: ISODate =
    start === "tomorrow" ? addDays(today, 1) : start === "monday" ? nextMondayAfter(today) : today;

  // The very function the store will run on confirm — same input, same output.
  const plan = useMemo(
    () => planTemplateSwitch({ instances, startDate }),
    [instances, startDate],
  );

  const reasons = [
    plan.kept.done > 0 ? t("switch.reasonDone", { count: plan.kept.done }) : null,
    plan.kept.running > 0 ? t("switch.reasonRunning", { count: plan.kept.running }) : null,
    plan.kept.noted > 0 ? t("switch.reasonNoted", { count: plan.kept.noted }) : null,
    plan.kept.measured > 0 ? t("switch.reasonMeasured", { count: plan.kept.measured }) : null,
    plan.kept.other > 0 ? t("switch.reasonOther", { count: plan.kept.other }) : null,
  ].filter((reason): reason is string => reason !== null);

  const preview =
    plan.replacedIds.length === 0
      ? t("switch.previewNothing")
      : [
          t("switch.previewReplaced", { count: plan.replacedIds.length }),
          t("switch.previewKept", { count: plan.kept.total }),
          reasons.length > 0 ? `(${reasons.join(", ")})` : "",
        ]
          .filter((part) => part !== "")
          .join(" · ");

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("switch.title")}
      description={`${templateName} — ${t("settings.applyTemplateWarning")}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              onConfirm(startDate);
              onOpenChange(false);
            }}
          >
            {t("common.apply")}
          </Button>
        </>
      }
    >
      <SegmentedControl
        legend={t("switch.startLabel")}
        name="template-switch-start"
        value={start}
        onChange={setStart}
        options={[
          { value: "today", label: t("switch.today") },
          { value: "tomorrow", label: t("switch.tomorrow") },
          { value: "monday", label: t("switch.nextMonday") },
        ]}
      />

      {/* Announced, because it is the answer to the choice just made. */}
      <p role="status" className="text-meta text-ink">
        {preview}
      </p>

      <p className="text-caption text-mute">{t("shift.toastHint")}</p>
    </Sheet>
  );
}

/**
 * One place for what happens after a successful apply: the toast carries the
 * "can undo for 10 seconds" promise and the button that keeps it.
 */
export function useTemplateSwitchFeedback() {
  const undoTemplateSwitchEvent = useAppStore((state) => state.undoTemplateSwitchEvent);
  const { t } = useI18n();

  return useCallback(
    async (apply: () => Promise<boolean>) => {
      const ok = await apply();
      if (!ok) return;

      // The store records the event id synchronously with the state update, so
      // it is readable the moment the promise resolves.
      const eventId = useAppStore.getState().lastTemplateSwitchEventId;
      if (eventId) {
        toastManager.add({
          title: t("switch.applied"),
          description: t("shift.toastHint"),
          timeout: 10_000,
          actionProps: {
            children: t("common.undo"),
            onClick: () => {
              void undoTemplateSwitchEvent(eventId);
              toastManager.add({ title: t("shift.undone"), timeout: 4_000 });
            },
          },
        });
      } else {
        toastManager.add({ title: t("switch.applied"), timeout: 3_000 });
      }
    },
    [undoTemplateSwitchEvent, t],
  );
}

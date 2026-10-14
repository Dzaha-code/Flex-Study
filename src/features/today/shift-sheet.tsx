"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/field";
import { IconInfo, IconWarning } from "@/components/ui/icons";
import { toastManager } from "@/components/ui/toast";
import { useAppStore } from "@/data/store";
import { addDays, planShift } from "@/domain";
import type { ShiftPlanInput } from "@/domain/shift";
import type { ShiftStrategy } from "@/domain/types";
import { useI18n, type MessageKey } from "@/i18n";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

interface StrategyOption {
  value: ShiftStrategy;
  labelKey: MessageKey;
  hintKey: MessageKey;
}

const STRATEGIES: StrategyOption[] = [
  {
    value: "move_open_to_next_slot",
    labelKey: "shift.strategy.nextSlot",
    hintKey: "shift.strategy.nextSlotHint",
  },
  { value: "move_open_to_day", labelKey: "shift.strategy.toDay", hintKey: "shift.strategy.toDayHint" },
  { value: "swap", labelKey: "shift.strategy.swap", hintKey: "shift.strategy.swapHint" },
  {
    value: "skip_rest",
    labelKey: "shift.strategy.skipRest",
    hintKey: "shift.strategy.skipRestHint",
  },
];

const HORIZON_DAYS = 14;

export function ShiftSheet({
  open,
  onOpenChange,
  date,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  date: string;
}) {
  const runShift = useAppStore((state) => state.runShift);
  const undoShiftEvent = useAppStore((state) => state.undoShiftEvent);
  const instances = useAppStore((state) => state.instances);
  const dayStart = useAppStore((state) => state.settings.dayStart);
  const dayEnd = useAppStore((state) => state.settings.dayEnd);
  const { t, formatDateShort, formatMinutes } = useI18n();

  const [strategy, setStrategy] = useState<ShiftStrategy>("move_open_to_next_slot");
  const [reason, setReason] = useState("");
  const [targetDate, setTargetDate] = useState(() => addDays(date, 1));
  const [swapFirst, setSwapFirst] = useState("");
  const [swapSecond, setSwapSecond] = useState("");

  const dayBlocks = useMemo(
    () =>
      instances
        .filter((instance) => instance.date === date && instance.status !== "deferred" && instance.status !== "skipped")
        .sort((a, b) => a.order - b.order),
    [instances, date],
  );

  /**
   * The preview and the applied change are the same object, computed by the
   * same pure engine — so what the user reviews is exactly what runs.
   */
  // While the sheet is open the clock keeps moving, so the preview is refreshed
  // periodically — "the next free slot" has to stay true.
  const now = useNow(open, 30_000);

  const plan = useMemo(() => {
    const request: ShiftPlanInput = {
      strategy,
      date,
      reason: reason.trim() === "" ? null : reason.trim(),
      targetDate: strategy === "move_open_to_day" ? targetDate : undefined,
      blockIds: strategy === "swap" && swapFirst ? [swapFirst] : undefined,
      swapWithId: strategy === "swap" ? swapSecond : undefined,
      horizonDays: HORIZON_DAYS,
      instances,
      settings: { dayStart, dayEnd },
      now,
    };
    return planShift(request);
  }, [
    strategy,
    date,
    reason,
    targetDate,
    swapFirst,
    swapSecond,
    instances,
    dayStart,
    dayEnd,
    now,
  ]);

  const movedCount = plan.moves.filter((move) => move.action === "moved").length;
  const skippedCount = plan.moves.filter((move) => move.action === "skipped").length;
  const leavesDay = plan.moves.some((move) => move.action === "moved" && move.toDate !== date);

  const dayOptions = Array.from({ length: HORIZON_DAYS }, (_, index) => {
    const value = addDays(date, index + 1);
    return { value, label: formatDateShort(value) };
  });

  const blockOptions = dayBlocks.map((instance) => ({ value: instance.id, label: instance.title }));

  async function handleApply() {
    const event = await runShift(plan);
    onOpenChange(false);
    if (!event) return;

    const eventId = event.id;
    toastManager.add({
      title: t("shift.applied"),
      description: t("shift.toastHint"),
      timeout: 10_000,
      actionProps: {
        children: t("common.undo"),
        onClick: () => {
          void undoShiftEvent(eventId);
          toastManager.add({ title: t("shift.undone"), timeout: 4_000 });
        },
      },
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("shift.title")}
      description={t("shift.description")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={plan.moves.length === 0} onClick={() => void handleApply()}>
            {t("common.apply")}
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-label font-medium text-ink-muted">
          {t("shift.strategyLabel")}
        </legend>
        {STRATEGIES.map((option) => {
          const active = option.value === strategy;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-panel border p-3 transition-colors",
                active ? "border-accent bg-accent-surface" : "border-line hover:bg-accent-surface/40",
              )}
            >
              <input
                type="radio"
                name="shift-strategy"
                value={option.value}
                checked={active}
                onChange={() => setStrategy(option.value)}
                className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-medium">{t(option.labelKey)}</span>
                <span className="text-label text-ink-muted">{t(option.hintKey)}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {strategy === "move_open_to_day" ? (
        <SelectField
          label={t("shift.targetDay")}
          value={targetDate}
          options={dayOptions}
          onChange={(event) => setTargetDate(event.target.value)}
        />
      ) : null}

      {strategy === "swap" ? (
        <div className="flex flex-col gap-3">
          <SelectField
            label={t("shift.pickFirst")}
            value={swapFirst}
            options={[{ value: "", label: "—" }, ...blockOptions]}
            onChange={(event) => setSwapFirst(event.target.value)}
          />
          <SelectField
            label={t("shift.pickSecond")}
            value={swapSecond}
            options={[{ value: "", label: "—" }, ...blockOptions]}
            onChange={(event) => setSwapSecond(event.target.value)}
          />
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-label font-medium text-ink-muted">
          {t("shift.reason")} <span className="font-normal">· {t("common.optional")}</span>
        </span>
        <input
          value={reason}
          maxLength={200}
          placeholder={t("shift.reasonPlaceholder")}
          onChange={(event) => setReason(event.target.value)}
          className="h-11 w-full rounded-control border border-line-strong bg-surface-raised px-3 text-body text-ink placeholder:text-ink-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>

      <section
        aria-labelledby="shift-preview-heading"
        className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-3"
      >
        <h3 id="shift-preview-heading" className="text-label font-semibold uppercase tracking-wide text-ink-muted">
          {t("shift.previewLabel")}
        </h3>

        {plan.moves.length === 0 ? (
          <p className="text-meta text-ink-muted">{t("shift.previewEmpty")}</p>
        ) : (
          <>
            <p className="text-meta">
              <strong className="font-semibold">
                {movedCount > 0 ? t("shift.previewMoved", { count: movedCount }) : null}
              </strong>
              {movedCount > 0 && skippedCount > 0 ? " · " : null}
              {skippedCount > 0 ? t("shift.previewSkipped", { count: skippedCount }) : null}
              {movedCount > 0 ? (
                <span className="text-ink-muted">
                  {" — "}
                  {leavesDay ? t("shift.movedLaterDay") : t("shift.movedSameDay")}
                  {" · "}
                  {formatMinutes(plan.movedMinutes + plan.skippedMinutes)}
                </span>
              ) : null}
            </p>

            <ul className="flex flex-col gap-1.5">
              {plan.moves.map((move) => (
                <li
                  key={move.instanceId}
                  className="flex items-baseline justify-between gap-3 text-meta"
                >
                  <span className="min-w-0 truncate">{move.title}</span>
                  <span className="shrink-0 text-ink-muted">
                    {move.action === "skipped"
                      ? t("status.skipped")
                      : move.toDate === date
                        ? `${move.fromStart ?? "—"} → ${move.toStart ?? "—"}`
                        : `${move.fromStart ?? "—"} → ${formatDateShort(move.toDate)}`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {plan.warnings.length > 0 ? (
          <ul className="flex flex-col gap-1 pt-1">
            {plan.warnings.map((warning) => (
              <li
                key={warning.key}
                className="flex items-start gap-1.5 text-label text-warn"
              >
                <IconWarning width={14} height={14} className="mt-0.5 shrink-0" />
                <span>{t(warning.key as MessageKey, warning.params)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <p className="flex items-start gap-1.5 text-label text-ink-muted">
        <IconInfo width={14} height={14} className="mt-0.5 shrink-0" />
        <span>
          {t("shift.runningKept")} {t("shift.description")}
        </span>
      </p>
    </Sheet>
  );
}

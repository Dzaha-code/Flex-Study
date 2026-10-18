"use client";

import { useAppStore } from "@/data/store";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { STABILO_PLACEHOLDER } from "../flags";
import { Sprite } from "./Sprite";

/**
 * A small, non-blocking appearance inside a form.
 *
 * The full dialogue is a takeover: scrim, spotlight, one thing at a time. That
 * is right for the tour and wrong inside a sheet the user is already filling
 * in, so this is a different shape on purpose — she stands in the corner of the
 * form, says one line, and never covers a field. No portal, no overlay, no
 * keyboard handler: the surrounding dialog keeps the focus it already owns.
 */
export function StabiloAside({
  text,
  action,
  className,
}: {
  text: string;
  /** One optional nudge, e.g. "use the block title as the name". */
  action?: { label: string; onClick: () => void; disabled?: boolean };
  className?: string;
}) {
  const enabled = useAppStore((state) => state.stabilo.enabled);
  const { t } = useI18n();

  if (!enabled) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-panel border border-line bg-raised p-3",
        className,
      )}
    >
      {/* Square, for the same reason as the stage slot: the sprites share one
          square canvas, so a narrow box makes the drawing spill over the text. */}
      <div className="h-20 w-20 shrink-0" aria-hidden="true">
        <Sprite
          sprite="flat"
          mouth="closed"
          placeholder={STABILO_PLACEHOLDER}
          onMissing={() => {}}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="w-fit rounded-[3px] bg-hl px-1.5 py-0.5 text-label font-semibold text-ink">
          {t("stabilo.speaker")}
        </span>
        <p className="text-meta leading-relaxed text-ink">{text}</p>
        {action ? (
          <button
            type="button"
            disabled={action.disabled}
            onClick={(event) => {
              event.stopPropagation();
              action.onClick();
            }}
            className="self-start text-caption text-ink-muted underline hover:text-ink disabled:opacity-40"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

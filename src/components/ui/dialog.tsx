"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";
import { IconClose } from "./icons";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * A bottom sheet on phones and a centred dialog on wider screens — one
 * component, so behaviour never forks.
 *
 * Elevation (shadow + heavier radius) is used here and nowhere else: this is one
 * of the few elements that genuinely floats above the page.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  const { t } = useI18n();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-ink/35 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Popup
          className={cn(
            "surface-floating fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:w-[34rem] sm:max-w-[calc(100vw-3rem)] sm:-translate-x-1/2 sm:-translate-y-1/2",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-title">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-meta text-ink-muted measure">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              render={
                <IconButton label={t("common.close")}>
                  <IconClose />
                </IconButton>
              }
            />
          </div>

          <div className="flex flex-col gap-4">{children}</div>

          {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

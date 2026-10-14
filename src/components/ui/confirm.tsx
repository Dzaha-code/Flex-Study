"use client";

import { useI18n } from "@/i18n";
import { Button } from "./button";
import { Sheet } from "./dialog";

export interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
}

/**
 * Destructive or wide-reaching changes always ask first. Paired with the
 * undo affordance on reschedules, nothing in the app is a one-way door.
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "primary",
  onConfirm,
}: ConfirmSheetProps) {
  const { t } = useI18n();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel ?? t("common.apply")}
          </Button>
        </>
      }
    >
      <span className="hidden" />
    </Sheet>
  );
}

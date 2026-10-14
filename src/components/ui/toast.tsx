"use client";

import { Toast } from "@base-ui/react/toast";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n";

/**
 * A global manager so any module can raise a toast — including the reschedule
 * flow, which needs an "Undo" affordance even after the sheet has closed.
 */
export const toastManager = Toast.createToastManager();

function ToastList() {
  const { toasts } = Toast.useToastManager();
  const { t } = useI18n();

  return (
    <Toast.Viewport className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-[min(100vw-2rem,28rem)] flex-col-reverse gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0">
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className="surface-floating pointer-events-auto flex items-center gap-3 p-3 transition-opacity duration-150 data-ending-style:opacity-0 data-limited:hidden data-starting-style:opacity-0 motion-reduce:transition-none"
        >
          <Toast.Content className="flex w-full items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Toast.Title className="text-meta font-semibold text-ink" />
              <Toast.Description className="text-label text-ink-muted" />
            </div>
            <Toast.Action className="shrink-0 rounded-control px-3 py-2 text-meta font-medium text-accent hover:bg-accent-surface" />
            <Toast.Close className="shrink-0 rounded-control border border-line px-3 py-2 text-meta text-ink-muted hover:bg-accent-surface">
              {t("error.dismiss")}
            </Toast.Close>
          </Toast.Content>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={3}>
      {children}
      <Toast.Portal>
        <ToastList />
      </Toast.Portal>
    </Toast.Provider>
  );
}

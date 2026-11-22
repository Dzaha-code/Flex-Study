"use client";

import { create } from "zustand";
import {
  checkForUpdate,
  installUpdate,
  installedVersion,
  supportsInAppUpdates,
  type AvailableUpdate,
} from "@/lib/desktop";

/**
 * Update state for the whole app: the banner, the sheet and the Settings row
 * all read this one store, so "checking", "found 0.5.8" and "downloading 40%"
 * never disagree between places. In memory only — a restart checks again.
 */
export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "installer-opened"
  | "needs-permission"
  | "restarting"
  | "error";

interface UpdateState {
  supported: boolean;
  currentVersion: string | null;
  status: UpdateStatus;
  update: AvailableUpdate | null;
  /** 0–100, or null while the size is unknown. */
  progress: number | null;
  error: string | null;
  sheetOpen: boolean;
  init: () => Promise<void>;
  check: (options?: { silent?: boolean }) => Promise<void>;
  install: () => Promise<void>;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  supported: false,
  currentVersion: null,
  status: "idle",
  update: null,
  progress: null,
  error: null,
  sheetOpen: false,

  init: async () => {
    const supported = supportsInAppUpdates();
    set({ supported, currentVersion: await installedVersion() });
  },

  check: async ({ silent = false } = {}) => {
    if (!get().supported) return;
    const busy = get().status;
    if (busy === "checking" || busy === "downloading") return;
    set({ status: "checking", error: null });
    try {
      const update = await checkForUpdate();
      set({ update, status: update ? "available" : "up-to-date" });
    } catch (error) {
      // A silent background check that fails (offline, no release yet) should
      // not leave an error on screen the user never asked for.
      set({
        status: silent ? "idle" : "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  install: async () => {
    if (!get().update) return;
    set({ status: "downloading", progress: null, error: null });
    try {
      const outcome = await installUpdate((progress) => set({ progress }));
      set({ status: outcome });
    } catch (error) {
      set({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  },

  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),
}));

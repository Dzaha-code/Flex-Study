"use client";

import { create } from "zustand";
import {
  addDays,
  applyShift as buildShiftApplication,
  createId,
  makeReflection,
  SCHEMA_VERSION,
  todayISO,
  undoShift,
  weekdayIndex,
} from "@/domain";
import type {
  BlockInstance,
  BlockTemplate,
  Category,
  CategorySymbol,
  Reflection,
  Settings,
  ShiftEvent,
  ShiftPlan,
} from "@/domain";
import { buildFromTemplate, findTemplate } from "@/templates";
import { DEFAULT_SETTINGS, DEFAULT_STABILO_PREFS } from "@/domain/types";
import type { StabiloPrefs } from "@/domain/types";
import { orphanedInstanceIds, propagateTemplateEdit } from "@/domain/propagate";
import {
  clearWorkspace,
  deleteUntouchedInstancesAfter,
  loadWorkspace,
  persistCategories,
  persistInstances,
  persistReflection,
  persistSettings,
  persistStabilo,
  persistShiftEvent,
  persistTemplates,
  removeCategory as removeCategoryRow,
  removeInstances,
  removeReflection as removeReflectionRow,
  removeTemplate as removeTemplateRow,
  replaceAll,
  type WriteOutcome,
} from "./repository";
import { isStorageAvailable } from "./db";
import {
  countWorkspace,
  parseWorkspaceImport,
  serializeWorkspace,
  type ImportResult,
} from "./workspace-io";
import { mirrorPreferences } from "@/lib/preferences";

/** How far ahead generated blocks are materialised. */
export const MATERIALISE_DAYS = 14;

const NOTE_DEBOUNCE_MS = 400;

export type AppStatus = "loading" | "ready" | "error";

export interface CategoryDraft {
  id?: string;
  name: string;
  icon: CategorySymbol;
  weeklyTargetMinutes: number;
}

export interface BlockTemplateDraft {
  id?: string;
  title: string;
  categoryId: string;
  durationMin: number;
  days: number[];
  plannedStart: string | null;
}

export interface InstanceDraft {
  date: string;
  title: string;
  categoryId: string;
  durationMin: number;
  plannedStart: string | null;
}

/**
 * A manual block carries its own definition, so these are the fields it
 * exposes for editing. Its date never changes — moving it is a reschedule.
 */
export type InstanceEditPatch = Omit<InstanceDraft, "date">;

export interface ReflectionDraftInput {
  date: string;
  title: string;
  body: string;
  learnings: string[];
  promptId: string | null;
  /** Omitted by the editor, which must not touch the star. */
  favorite?: boolean;
}

export interface AppState {
  status: AppStatus;
  storageNotice: "quota" | "unavailable" | "unknown" | null;
  settings: Settings;
  stabilo: StabiloPrefs;
  categories: Category[];
  templates: BlockTemplate[];
  instances: BlockInstance[];
  reflections: Reflection[];
  shiftEvents: ShiftEvent[];
  lastShiftEventId: string | null;

  hydrate: () => Promise<void>;
  dismissStorageNotice: () => void;

  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  updateStabilo: (patch: Partial<StabiloPrefs>) => Promise<void>;

  saveCategory: (draft: CategoryDraft) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveBlockTemplate: (draft: BlockTemplateDraft) => Promise<void>;
  deleteBlockTemplate: (id: string) => Promise<void>;
  /** Edits a block that has no template behind it. */
  updateInstance: (id: string, patch: InstanceEditPatch) => Promise<void>;
  /** Order decides the sequence of blocks that have no fixed start time. */
  reorderBlockTemplate: (id: string, direction: -1 | 1) => Promise<void>;
  applyTemplate: (
    templateId: string,
    options?: { completeOnboarding?: boolean },
  ) => Promise<void>;

  ensureRange: (from: string, to: string) => Promise<void>;
  addInstance: (draft: InstanceDraft) => Promise<void>;
  removeInstance: (id: string) => Promise<void>;
  startBlock: (id: string) => Promise<void>;
  completeBlock: (id: string) => Promise<void>;
  resetBlock: (id: string) => Promise<void>;
  skipBlock: (id: string) => Promise<void>;
  setNote: (id: string, note: string) => void;

  runShift: (plan: ShiftPlan) => Promise<ShiftEvent | null>;
  undoShiftEvent: (eventId: string) => Promise<void>;
  dismissShift: () => void;

  saveReflection: (draft: ReflectionDraftInput) => Promise<void>;
  deleteReflection: (id: string) => Promise<void>;
  setReflectionFavorite: (id: string, favorite: boolean) => Promise<void>;

  exportWorkspace: () => string;
  importWorkspace: (json: string) => Promise<ImportResult>;
  resetEverything: () => Promise<void>;
}

function replaceInstance(instances: BlockInstance[], next: BlockInstance): BlockInstance[] {
  const index = instances.findIndex((instance) => instance.id === next.id);
  if (index === -1) return [...instances, next];
  const copy = instances.slice();
  copy[index] = next;
  return copy;
}

function upsertById<T extends { id: string }>(rows: T[], next: T[]): T[] {
  const map = new Map(rows.map((row) => [row.id, row]));
  for (const row of next) map.set(row.id, row);
  return [...map.values()];
}

const dirtyNoteIds = new Set<string>();
let noteTimer: ReturnType<typeof setTimeout> | null = null;

async function flushNoteWrites(): Promise<void> {
  if (dirtyNoteIds.size === 0) return;
  const ids = [...dirtyNoteIds];
  dirtyNoteIds.clear();
  const instances = useAppStore.getState().instances.filter((instance) => ids.includes(instance.id));
  if (instances.length === 0) return;
  const outcome = await persistInstances(instances);
  if (!outcome.ok) useAppStore.setState({ storageNotice: outcome.reason });
}

export const useAppStore = create<AppState>()((set, get) => {
  const guardWrite = (outcome: WriteOutcome): void => {
    if (!outcome.ok) set({ storageNotice: outcome.reason });
  };

  const currentWorkspace = (state: AppState) => ({
    categories: state.categories,
    templates: state.templates,
    instances: state.instances,
    reflections: state.reflections,
      shiftEvents: state.shiftEvents,
      settings: state.settings,
      stabilo: state.stabilo,
    });

  return {
    status: "loading",
    storageNotice: null,
    settings: { ...DEFAULT_SETTINGS },
    stabilo: { ...DEFAULT_STABILO_PREFS },
    categories: [],
    templates: [],
    instances: [],
    reflections: [],
    shiftEvents: [],
    lastShiftEventId: null,

    hydrate: async () => {
      if (!isStorageAvailable()) {
        // Still usable, but nothing can be remembered between visits.
        set({ status: "ready", storageNotice: "unavailable" });
        return;
      }
      try {
        const workspace = await loadWorkspace();
        set({ ...workspace, status: "ready" });
        mirrorPreferences(workspace.settings);
        const today = todayISO(Date.now());
        await get().ensureRange(today, addDays(today, MATERIALISE_DAYS));
      } catch (error) {
        console.error("[flexstudy] hydrate failed", error);
        set({ status: "error" });
      }
    },

    dismissStorageNotice: () => set({ storageNotice: null }),

    updateSettings: async (patch) => {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      mirrorPreferences(settings);
      guardWrite(await persistSettings(settings));
    },

    updateStabilo: async (patch) => {
      const stabilo = { ...get().stabilo, ...patch };
      set({ stabilo });
      guardWrite(await persistStabilo(stabilo));
    },

    saveCategory: async (draft) => {
      const state = get();
      const stamp = new Date().toISOString();
      const existing = draft.id
        ? state.categories.find((category) => category.id === draft.id)
        : undefined;

      const category: Category = {
        id: existing?.id ?? createId("cat"),
        name: draft.name.trim() || "—",
        icon: draft.icon,
        weeklyTargetMinutes: Math.max(0, Math.round(draft.weeklyTargetMinutes)),
        order: existing?.order ?? state.categories.length,
        createdAt: existing?.createdAt ?? stamp,
        updatedAt: stamp,
        schemaVersion: SCHEMA_VERSION,
      };

      set({ categories: upsertById(state.categories, [category]) });
      guardWrite(await persistCategories([category]));
    },

    deleteCategory: async (id) => {
      const state = get();
      set({ categories: state.categories.filter((category) => category.id !== id) });
      guardWrite(await removeCategoryRow(id));
    },

    saveBlockTemplate: async (draft) => {
      const state = get();
      const stamp = new Date().toISOString();
      const existing = draft.id
        ? state.templates.find((template) => template.id === draft.id)
        : undefined;

      const template: BlockTemplate = {
        id: existing?.id ?? createId("tpl"),
        categoryId: draft.categoryId,
        title: draft.title.trim() || "—",
        durationMin: Math.min(1_440, Math.max(1, Math.round(draft.durationMin))),
        days: [...new Set(draft.days)].sort((a, b) => a - b),
        order: existing?.order ?? state.templates.length,
        plannedStart: draft.plannedStart,
        archived: false,
        createdAt: existing?.createdAt ?? stamp,
        updatedAt: stamp,
        schemaVersion: SCHEMA_VERSION,
      };

      set({ templates: upsertById(state.templates, [template]) });
      guardWrite(await persistTemplates([template]));

      const today = todayISO(Date.now());
      // Every block keeps its own copy of the title, duration, category and
      // start, so editing the template alone would leave the old text on every
      // day up to today — a corrected typo would still read wrong on today's
      // timeline. Rewrite the untouched days; the future is dropped and
      // regenerated below, which also picks up newly added weekdays.
      const rewritten = propagateTemplateEdit(state.instances, template, stamp, today);
      if (rewritten.length > 0) guardWrite(await persistInstances(rewritten));

      guardWrite(await deleteUntouchedInstancesAfter(today));
      const fresh = await loadWorkspace();
      set({ instances: fresh.instances });
      await get().ensureRange(today, addDays(today, MATERIALISE_DAYS));
    },

    deleteBlockTemplate: async (id) => {
      const state = get();
      const today = todayISO(Date.now());

      set({ templates: state.templates.filter((template) => template.id !== id) });
      guardWrite(await removeTemplateRow(id));

      // Take the pending occurrences with it. Without this the deleted block
      // keeps appearing on today's timeline, pointing at a template that no
      // longer exists. Occurrences the user already worked on stay as history.
      const orphans = orphanedInstanceIds(state.instances, [id], today);
      if (orphans.length > 0) guardWrite(await removeInstances(orphans));

      guardWrite(await deleteUntouchedInstancesAfter(today));
      const fresh = await loadWorkspace();
      set({ instances: fresh.instances });
      // Rematerialise the remaining templates, so the future is not left empty
      // until the next navigation happens to call ensureRange.
      await get().ensureRange(today, addDays(today, MATERIALISE_DAYS));
    },

    reorderBlockTemplate: async (id, direction) => {
      const state = get();
      const ordered = [...state.templates].sort(
        (a, b) => a.order - b.order || a.id.localeCompare(b.id),
      );
      const index = ordered.findIndex((template) => template.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= ordered.length) return;

      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      const stamp = new Date().toISOString();
      const renumbered = ordered.map((template, position) => ({
        ...template,
        order: position,
        updatedAt: stamp,
      }));

      set({ templates: renumbered });
      guardWrite(await persistTemplates(renumbered));
    },

    applyTemplate: async (templateId, options) => {
      const template = findTemplate(templateId);
      if (!template) return;

      const state = get();
      const now = Date.now();
      const today = todayISO(now);
      const { categories, blockTemplates } = buildFromTemplate({
        template,
        now,
        newId: createId,
        locale: state.settings.locale,
      });

      // History is kept: only generated-and-untouched future blocks are dropped.
      const keptInstances = state.instances.filter(
        (instance) =>
          instance.date <= today ||
          instance.status !== "planned" ||
          instance.actualSeconds > 0 ||
          instance.note.trim() !== "" ||
          instance.movedFrom !== null,
      );

      const settings: Settings = {
        ...state.settings,
        activeTemplateId: templateId,
        // Onboarding keeps the shell open across its own steps and flips this
        // flag only on the last one.
        onboardingCompleted:
          options?.completeOnboarding === false ? state.settings.onboardingCompleted : true,
      };

      const workspace = {
        categories,
        templates: blockTemplates,
        instances: keptInstances,
        reflections: state.reflections,
        shiftEvents: state.shiftEvents,
        settings,
      };

      set({ ...workspace });
      mirrorPreferences(settings);
      guardWrite(await replaceAll(workspace));
      await get().ensureRange(today, addDays(today, MATERIALISE_DAYS));
    },

    ensureRange: async (from, to) => {
      const state = get();
      if (state.templates.length === 0) return;

      // Past days are never generated: they show what actually happened.
      const today = todayISO(Date.now());
      const start = from > today ? from : today;
      if (start > to) return;

      const existing = new Set(
        state.instances
          .filter((instance) => instance.date >= start && instance.date <= to)
          .map((instance) => `${instance.date}|${instance.templateId ?? ""}`),
      );

      const stamp = new Date().toISOString();
      const created: BlockInstance[] = [];

      for (let date = start; date <= to; date = addDays(date, 1)) {
        const weekday = weekdayIndex(date);
        for (const template of state.templates) {
          if (template.archived || !template.days.includes(weekday)) continue;
          if (existing.has(`${date}|${template.id}`)) continue;
          created.push({
            id: createId("blk"),
            date,
            templateId: template.id,
            categoryId: template.categoryId,
            title: template.title,
            durationMin: template.durationMin,
            plannedStart: template.plannedStart,
            order: template.order,
            status: "planned",
            actualSeconds: 0,
            startedAt: null,
            note: "",
            movedFrom: null,
            movedTo: null,
            createdAt: stamp,
            updatedAt: stamp,
            schemaVersion: SCHEMA_VERSION,
          });
        }
      }

      if (created.length === 0) return;
      set({ instances: [...state.instances, ...created] });
      guardWrite(await persistInstances(created));
    },

    addInstance: async (draft) => {
      const state = get();
      const stamp = new Date().toISOString();
      const sameDay = state.instances.filter((instance) => instance.date === draft.date);
      const instance: BlockInstance = {
        id: createId("blk"),
        date: draft.date,
        templateId: null,
        categoryId: draft.categoryId,
        title: draft.title.trim() || "—",
        durationMin: Math.min(1_440, Math.max(1, Math.round(draft.durationMin))),
        plannedStart: draft.plannedStart,
        order: sameDay.reduce((max, item) => Math.max(max, item.order), -1) + 1,
        status: "planned",
        actualSeconds: 0,
        startedAt: null,
        note: "",
        movedFrom: null,
        movedTo: null,
        createdAt: stamp,
        updatedAt: stamp,
        schemaVersion: SCHEMA_VERSION,
      };

      set({ instances: [...state.instances, instance] });
      guardWrite(await persistInstances([instance]));
    },

    removeInstance: async (id) => {
      const state = get();
      set({ instances: state.instances.filter((instance) => instance.id !== id) });
      guardWrite(await removeInstances([id]));
    },

    updateInstance: async (id, patch) => {
      const state = get();
      const existing = state.instances.find((instance) => instance.id === id);
      if (!existing) return;

      // A manual block owns its definition, so this is the only place the
      // change has to go. Template-backed blocks are edited at the template
      // instead — see resolveEditTarget.
      const instance: BlockInstance = {
        ...existing,
        title: patch.title.trim() || "—",
        categoryId: patch.categoryId,
        durationMin: Math.min(1_440, Math.max(1, Math.round(patch.durationMin))),
        plannedStart: patch.plannedStart,
        updatedAt: new Date().toISOString(),
      };

      set({ instances: upsertById(state.instances, [instance]) });
      guardWrite(await persistInstances([instance]));
    },

    startBlock: async (id) => {
      const state = get();
      const now = Date.now();
      const stamp = new Date(now).toISOString();
      const changed: BlockInstance[] = [];

      // One timer at a time: starting a block parks whatever was running and
      // banks its measured seconds.
      for (const instance of state.instances) {
        if (instance.id === id) {
          changed.push({ ...instance, status: "running", startedAt: now, updatedAt: stamp });
          continue;
        }
        if (instance.status === "running" && instance.startedAt !== null) {
          changed.push({
            ...instance,
            status: "planned",
            startedAt: null,
            actualSeconds:
              instance.actualSeconds + Math.max(0, Math.floor((now - instance.startedAt) / 1000)),
            updatedAt: stamp,
          });
        }
      }

      set({ instances: upsertById(state.instances, changed) });
      guardWrite(await persistInstances(changed));
    },

    completeBlock: async (id) => {
      const state = get();
      const target = state.instances.find((instance) => instance.id === id);
      if (!target) return;
      const now = Date.now();
      const spent =
        target.status === "running" && target.startedAt !== null
          ? Math.max(0, Math.floor((now - target.startedAt) / 1000))
          : 0;
      const next: BlockInstance = {
        ...target,
        status: "done",
        startedAt: null,
        actualSeconds: target.actualSeconds + spent,
        updatedAt: new Date(now).toISOString(),
      };
      set({ instances: replaceInstance(state.instances, next) });
      guardWrite(await persistInstances([next]));
    },

    resetBlock: async (id) => {
      const state = get();
      const target = state.instances.find((instance) => instance.id === id);
      if (!target) return;
      const now = Date.now();
      const spent =
        target.status === "running" && target.startedAt !== null
          ? Math.max(0, Math.floor((now - target.startedAt) / 1000))
          : 0;
      const next: BlockInstance = {
        ...target,
        status: "planned",
        startedAt: null,
        actualSeconds: target.actualSeconds + spent,
        movedTo: null,
        updatedAt: new Date(now).toISOString(),
      };
      set({ instances: replaceInstance(state.instances, next) });
      guardWrite(await persistInstances([next]));
    },

    skipBlock: async (id) => {
      const state = get();
      const target = state.instances.find((instance) => instance.id === id);
      if (!target) return;
      const now = Date.now();
      const spent =
        target.status === "running" && target.startedAt !== null
          ? Math.max(0, Math.floor((now - target.startedAt) / 1000))
          : 0;
      const next: BlockInstance = {
        ...target,
        status: "skipped",
        startedAt: null,
        actualSeconds: target.actualSeconds + spent,
        updatedAt: new Date(now).toISOString(),
      };
      set({ instances: replaceInstance(state.instances, next) });
      guardWrite(await persistInstances([next]));
    },

    setNote: (id, note) => {
      const state = get();
      const target = state.instances.find((instance) => instance.id === id);
      if (!target) return;
      const next: BlockInstance = {
        ...target,
        note,
        updatedAt: new Date().toISOString(),
      };
      set({ instances: replaceInstance(state.instances, next) });

      dirtyNoteIds.add(id);
      if (noteTimer) clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        void flushNoteWrites();
      }, NOTE_DEBOUNCE_MS);
    },

    runShift: async (plan) => {
      if (plan.moves.length === 0) return null;
      const state = get();
      const application = buildShiftApplication(plan, state.instances, {
        now: Date.now(),
        newId: createId,
      });

      const map = new Map(state.instances.map((instance) => [instance.id, instance]));
      for (const instance of application.upserts) map.set(instance.id, instance);
      for (const id of application.deletes) map.delete(id);

      set({
        instances: [...map.values()],
        shiftEvents: upsertById(state.shiftEvents, [application.event]),
        lastShiftEventId: application.event.id,
      });

      guardWrite(await persistInstances(application.upserts));
      guardWrite(await removeInstances(application.deletes));
      guardWrite(await persistShiftEvent(application.event));
      return application.event;
    },

    undoShiftEvent: async (eventId) => {
      const state = get();
      const event = state.shiftEvents.find((item) => item.id === eventId);
      if (!event || event.undone) return;

      const undo = undoShift(event);
      const map = new Map(state.instances.map((instance) => [instance.id, instance]));
      for (const instance of undo.upserts) map.set(instance.id, instance);
      for (const id of undo.deletes) map.delete(id);

      const marked: ShiftEvent = { ...event, undone: true, updatedAt: new Date().toISOString() };

      set({
        instances: [...map.values()],
        shiftEvents: upsertById(state.shiftEvents, [marked]),
        lastShiftEventId: null,
      });

      guardWrite(await persistInstances(undo.upserts));
      guardWrite(await removeInstances(undo.deletes));
      guardWrite(await persistShiftEvent(marked));
    },

    dismissShift: () => set({ lastShiftEventId: null }),

    saveReflection: async (draft) => {
      const state = get();
      const existing =
        state.reflections.find((reflection) => reflection.date === draft.date) ?? null;
      const reflection = makeReflection({
        date: draft.date,
        title: draft.title,
        body: draft.body,
        learnings: draft.learnings,
        promptId: draft.promptId,
        favorite: draft.favorite,
        existing,
        now: Date.now(),
        newId: createId,
      });

      set({ reflections: upsertById(state.reflections, [reflection]) });
      guardWrite(await persistReflection(reflection));
    },

    deleteReflection: async (id) => {
      const state = get();
      set({ reflections: state.reflections.filter((reflection) => reflection.id !== id) });
      guardWrite(await removeReflectionRow(id));
    },

    setReflectionFavorite: async (id, favorite) => {
      const state = get();
      const existing = state.reflections.find((reflection) => reflection.id === id);
      if (!existing || existing.favorite === favorite) return;
      const next: Reflection = { ...existing, favorite, updatedAt: new Date().toISOString() };
      set({ reflections: upsertById(state.reflections, [next]) });
      guardWrite(await persistReflection(next));
    },

    exportWorkspace: () => serializeWorkspace(currentWorkspace(get()), Date.now()),

    importWorkspace: async (json) => {
      const parsed = parseWorkspaceImport(json);
      if (!parsed.ok) return parsed;

      set({ ...parsed.workspace, lastShiftEventId: null });
      mirrorPreferences(parsed.workspace.settings);

      const outcome = await replaceAll(parsed.workspace);
      if (!outcome.ok) {
        set({ storageNotice: outcome.reason });
        return { ok: false, errors: [`storage.${outcome.reason}`] };
      }
      return parsed;
    },

    resetEverything: async () => {
      const outcome = await clearWorkspace();
      if (!outcome.ok) set({ storageNotice: outcome.reason });
      set({
        categories: [],
        templates: [],
        instances: [],
        reflections: [],
        shiftEvents: [],
        lastShiftEventId: null,
        settings: { ...DEFAULT_SETTINGS },
        stabilo: { ...DEFAULT_STABILO_PREFS },
        status: "ready",
      });
      // The boot mirror has to be reset too, or the erased preference would keep
      // deciding the theme, the language and the intro on the next launch.
      mirrorPreferences(DEFAULT_SETTINGS);
    },
  };
});

export { countWorkspace, serializeWorkspace };

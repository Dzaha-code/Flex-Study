"use client";

import { create } from "zustand";
import type { z } from "zod";
import { addDays, todayISO } from "@/domain/time";
import { duplicateGeneratedIds, type SyncRow, type SyncableState } from "@/domain/sync";
import { mirrorPreferences } from "@/lib/preferences";
import { applySyncBatch, type SyncBatch } from "../repository";
import {
  BlockInstanceSchema,
  BlockTemplateSchema,
  CategorySchema,
  customTemplatesSchema,
  ReflectionSchema,
  SettingsSchema,
  ShiftEventSchema,
  StabiloPrefsSchema,
  TemplateSwitchEventSchema,
} from "../schema";
import { MATERIALISE_DAYS, useAppStore } from "../store";
import { SyncEngine, type PersistedSyncState, type SyncAdapter, type SyncSnapshot } from "./engine";
import {
  currentSession,
  getClient,
  onSessionChange,
  sendLoginCode,
  signOut as supabaseSignOut,
  supabaseTransport,
  syncConfigured,
  verifyLoginCode,
} from "./supabase";

/**
 * Account and sync state for the UI, plus the glue between the engine and the
 * app store. Signing in is optional and only ever adds sync: signed out, the
 * app is exactly the offline app it always was, and signing out keeps every
 * row on this device.
 */

const STATE_KEY = "flexstudy.sync.v1";

/**
 * Kept in localStorage, not IndexedDB: applying a template or importing a
 * backup clears the `meta` table wholesale, and losing this map would make the
 * next sync forget which rows this device had deleted.
 */
const stateStore = {
  load(): PersistedSyncState | null {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? (JSON.parse(raw) as PersistedSyncState) : null;
    } catch {
      return null;
    }
  },
  save(value: PersistedSyncState) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(value));
    } catch {
      // Full or blocked storage: the next sync simply re-agrees from scratch.
    }
  },
  clear() {
    try {
      localStorage.removeItem(STATE_KEY);
    } catch {
      // Nothing to clear.
    }
  },
};

const SYNCED_SETTINGS_SCHEMA = SettingsSchema.pick({
  weekStart: true,
  dayStart: true,
  dayEnd: true,
  activeTemplateId: true,
});
const SYNCED_STABILO_SCHEMA = StabiloPrefsSchema.pick({ nickname: true, intensity: true });

function snapshot(): SyncableState {
  const state = useAppStore.getState();
  return {
    categories: state.categories,
    templates: state.templates,
    instances: state.instances,
    reflections: state.reflections,
    shiftEvents: state.shiftEvents,
    switchEvents: state.switchEvents,
    settings: state.settings,
    stabilo: state.stabilo,
    customTemplates: state.customTemplates,
  };
}

/** A row from another device is untrusted until its schema says otherwise. */
function parse<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const result = schema.safeParse(value);
  if (!result.success) {
    console.warn("[flexstudy] sync row rejected", result.error.issues[0]);
    return null;
  }
  return result.data;
}

function upsert<T extends { id: string }>(list: T[], put: T[], remove: string[]): T[] {
  if (put.length === 0 && remove.length === 0) return list;
  const drop = new Set([...remove, ...put.map((item) => item.id)]);
  return [...list.filter((item) => !drop.has(item.id)), ...put];
}

async function applyRows(rows: SyncRow[]): Promise<void> {
  const batch: SyncBatch = {
    categories: { put: [], remove: [] },
    templates: { put: [], remove: [] },
    instances: { put: [], remove: [] },
    reflections: { put: [], remove: [] },
    shiftEvents: { put: [], remove: [] },
    switchEvents: { put: [], remove: [] },
    settings: null,
    stabilo: null,
    customTemplates: null,
  };
  const app = useAppStore.getState();

  for (const row of rows) {
    switch (row.kind) {
      case "category": {
        if (row.deleted) batch.categories.remove.push(row.id);
        else {
          const value = parse(CategorySchema, row.data);
          if (value) batch.categories.put.push(value);
        }
        break;
      }
      case "template": {
        if (row.deleted) batch.templates.remove.push(row.id);
        else {
          const value = parse(BlockTemplateSchema, row.data);
          if (value) batch.templates.put.push(value);
        }
        break;
      }
      case "instance": {
        if (row.deleted) batch.instances.remove.push(row.id);
        else {
          const value = parse(BlockInstanceSchema, row.data);
          if (value) batch.instances.put.push(value);
        }
        break;
      }
      case "reflection": {
        if (row.deleted) batch.reflections.remove.push(row.id);
        else {
          const value = parse(ReflectionSchema, row.data);
          if (value) batch.reflections.put.push(value);
        }
        break;
      }
      case "shiftEvent": {
        if (row.deleted) batch.shiftEvents.remove.push(row.id);
        else {
          const value = parse(ShiftEventSchema, row.data);
          if (value) batch.shiftEvents.put.push(value);
        }
        break;
      }
      case "switchEvent": {
        if (row.deleted) batch.switchEvents.remove.push(row.id);
        else {
          const value = parse(TemplateSwitchEventSchema, row.data);
          if (value) batch.switchEvents.put.push(value);
        }
        break;
      }
      case "settings": {
        const value = row.deleted ? null : parse(SYNCED_SETTINGS_SCHEMA, row.data);
        if (value) batch.settings = { ...app.settings, ...value };
        break;
      }
      case "stabilo": {
        const value = row.deleted ? null : parse(SYNCED_STABILO_SCHEMA, row.data);
        if (value) batch.stabilo = { ...app.stabilo, ...value };
        break;
      }
      case "customTemplates": {
        const value = row.deleted ? null : parse(customTemplatesSchema, row.data);
        if (value) batch.customTemplates = value;
        break;
      }
    }
  }

  // Rows from before ids were deterministic can now meet their twin from the
  // other device; keep one. The dropped one is a local deletion, so the next
  // round pushes it and the other device drops it too.
  const merged = upsert(app.instances, batch.instances.put, batch.instances.remove);
  const duplicates = duplicateGeneratedIds(merged);
  if (duplicates.length > 0) {
    batch.instances.remove.push(...duplicates);
    batch.instances.put = batch.instances.put.filter((item) => !duplicates.includes(item.id));
  }

  const outcome = await applySyncBatch(batch);
  if (!outcome.ok) throw new Error(`local-write-${outcome.reason}`);

  useAppStore.setState((state) => ({
    categories: upsert(state.categories, batch.categories.put, batch.categories.remove),
    templates: upsert(state.templates, batch.templates.put, batch.templates.remove),
    instances: upsert(state.instances, batch.instances.put, batch.instances.remove),
    reflections: upsert(state.reflections, batch.reflections.put, batch.reflections.remove),
    shiftEvents: upsert(state.shiftEvents, batch.shiftEvents.put, batch.shiftEvents.remove),
    switchEvents: upsert(state.switchEvents, batch.switchEvents.put, batch.switchEvents.remove),
    settings: batch.settings ?? state.settings,
    stabilo: batch.stabilo ?? state.stabilo,
    customTemplates: batch.customTemplates ?? state.customTemplates,
  }));
  if (batch.settings) mirrorPreferences(batch.settings);

  // A plan that arrived from the other device still has to be laid out here.
  if (batch.templates.put.length > 0 || batch.templates.remove.length > 0) {
    const today = todayISO(Date.now());
    await useAppStore.getState().ensureRange(today, addDays(today, MATERIALISE_DAYS));
  }
}

const adapter: SyncAdapter = {
  snapshot,
  apply: applyRows,
  onLocalChange(listener) {
    return useAppStore.subscribe((state, previous) => {
      if (state.status !== "ready") return;
      if (
        state.categories !== previous.categories ||
        state.templates !== previous.templates ||
        state.instances !== previous.instances ||
        state.reflections !== previous.reflections ||
        state.shiftEvents !== previous.shiftEvents ||
        state.switchEvents !== previous.switchEvents ||
        state.settings !== previous.settings ||
        state.stabilo !== previous.stabilo ||
        state.customTemplates !== previous.customTemplates
      ) {
        listener();
      }
    });
  },
};

export type LoginStep = "email" | "code";

interface SyncUiState extends SyncSnapshot {
  configured: boolean;
  initialised: boolean;
  email: string | null;
  loginStep: LoginStep;
  pendingEmail: string;
  busy: boolean;
  loginError: LoginErrorCode | null;

  init: () => Promise<void>;
  sendCode: (email: string) => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  backToEmail: () => void;
  syncNow: () => Promise<void>;
  resolveFirstSync: (choice: "account" | "merge") => Promise<void>;
  signOut: () => Promise<void>;
}

let engine: SyncEngine | null = null;
let engineUser: string | null = null;

function describe(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return String(error);
}

/**
 * Sign-in failures as codes the panel can translate. Supabase answers in
 * English; showing "Token has expired or is invalid" to someone typing a code
 * in Indonesian helps nobody.
 */
export type LoginErrorCode = "network" | "code" | "rate" | "other";

function loginErrorCode(error: unknown): LoginErrorCode {
  const message = describe(error).toLowerCase();
  const status =
    error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
  if (message.includes("fetch") || message.includes("network")) return "network";
  if (status === 429 || message.includes("rate limit") || message.includes("security purposes")) {
    return "rate";
  }
  if (message.includes("expired") || message.includes("invalid") || message.includes("token")) {
    return "code";
  }
  return "other";
}

export const useSyncStore = create<SyncUiState>((set, get) => {
  async function startFor(userId: string, email: string | null) {
    if (engine && engineUser === userId) return;
    engine?.stop();
    const client = await getClient();
    engineUser = userId;
    engine = new SyncEngine({
      userId,
      transport: supabaseTransport(client, userId),
      adapter,
      state: stateStore,
      onSnapshot: (value) => set(value),
    });
    set({ email });
    await engine.start();
  }

  function stopEngine() {
    engine?.stop();
    engine = null;
    engineUser = null;
  }

  return {
    status: "idle",
    live: false,
    lastSyncedAt: null,
    error: null,
    configured: syncConfigured(),
    initialised: false,
    email: null,
    loginStep: "email",
    pendingEmail: "",
    busy: false,
    loginError: null,

    init: async () => {
      if (get().initialised || !syncConfigured()) return;
      set({ initialised: true });
      try {
        const session = await currentSession();
        if (session) await startFor(session.user.id, session.user.email ?? null);
        await onSessionChange((next) => {
          if (next) void startFor(next.user.id, next.user.email ?? null);
          else {
            stopEngine();
            set({ email: null, status: "idle", live: false });
          }
        });
      } catch (error) {
        set({ status: "error", error: describe(error) });
      }
    },

    sendCode: async (email) => {
      set({ busy: true, loginError: null });
      try {
        await sendLoginCode(email);
        set({ busy: false, loginStep: "code", pendingEmail: email.trim() });
        return true;
      } catch (error) {
        console.warn("[flexstudy] send code failed", describe(error));
        set({ busy: false, loginError: loginErrorCode(error) });
        return false;
      }
    },

    verifyCode: async (code) => {
      set({ busy: true, loginError: null });
      try {
        const session = await verifyLoginCode(get().pendingEmail, code);
        set({ busy: false, loginStep: "email", pendingEmail: "" });
        await startFor(session.user.id, session.user.email ?? null);
        return true;
      } catch (error) {
        console.warn("[flexstudy] verify code failed", describe(error));
        set({ busy: false, loginError: loginErrorCode(error) });
        return false;
      }
    },

    backToEmail: () => set({ loginStep: "email", loginError: null }),

    syncNow: async () => {
      await engine?.sync();
    },

    resolveFirstSync: async (choice) => {
      await engine?.resolveFirstSync(choice);
    },

    signOut: async () => {
      // This device keeps every row; it only stops talking to the account.
      engine?.forget();
      stopEngine();
      await supabaseSignOut().catch(() => {});
      set({ email: null, status: "idle", live: false, lastSyncedAt: null, error: null });
    },
  };
});

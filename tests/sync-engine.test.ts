import { describe, expect, it } from "vitest";
import {
  SyncEngine,
  type PersistedSyncState,
  type RemoteRow,
  type SyncAdapter,
  type SyncTransport,
} from "@/data/sync/engine";
import type { SyncRow, SyncableState } from "@/domain/sync";
import { DEFAULT_STABILO_PREFS } from "@/domain/types";
import type { BlockInstance, Reflection } from "@/domain/types";
import { baseSettings, makeInstance, STAMP } from "./helpers";

/** One Supabase stand-in: last write wins on `updatedAt`, fans out live. */
class FakeServer {
  rows = new Map<string, RemoteRow>();
  private clock = 0;
  private listeners = new Set<(row: RemoteRow) => void>();
  offline = false;

  transport(): SyncTransport {
    return {
      pull: async (since) => {
        if (this.offline) throw new Error("offline");
        return [...this.rows.values()]
          .filter((row) => since === null || row.serverAt > since)
          .sort((a, b) => a.serverAt.localeCompare(b.serverAt));
      },
      push: async (rows) => {
        if (this.offline) throw new Error("offline");
        for (const row of rows) {
          const key = `${row.kind}:${row.id}`;
          const existing = this.rows.get(key);
          if (existing && existing.updatedAt > row.updatedAt) continue;
          this.clock += 1;
          const stored: RemoteRow = {
            ...row,
            serverAt: new Date(Date.UTC(2026, 10, 20, 0, 0, this.clock)).toISOString(),
          };
          this.rows.set(key, stored);
          for (const listener of this.listeners) listener(stored);
        }
      },
      subscribe: (onRow, onState) => {
        this.listeners.add(onRow);
        onState(true);
        return () => this.listeners.delete(onRow);
      },
    };
  }
}

/** A device: its own state, its own sync bookkeeping, one engine. */
class Device {
  state: SyncableState;
  private saved: PersistedSyncState | null = null;
  private listeners = new Set<() => void>();
  engine: SyncEngine;
  private tick = 0;

  constructor(server: FakeServer, initial: Partial<SyncableState> = {}) {
    this.state = {
      categories: [],
      templates: [],
      instances: [],
      reflections: [],
      shiftEvents: [],
      switchEvents: [],
      settings: baseSettings,
      stabilo: DEFAULT_STABILO_PREFS,
      customTemplates: [],
      ...initial,
    };
    const adapter: SyncAdapter = {
      snapshot: () => this.state,
      apply: async (rows) => this.applyRows(rows),
      onLocalChange: (listener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      },
    };
    this.engine = new SyncEngine({
      userId: "user-1",
      transport: server.transport(),
      adapter,
      state: {
        load: () => this.saved,
        save: (value) => {
          this.saved = structuredClone(value);
        },
        clear: () => {
          this.saved = null;
        },
      },
      pushDelayMs: 0,
      pollMs: 0,
      now: () => Date.parse("2026-11-20T10:00:00.000Z") + this.tick++ * 1000,
    });
  }

  private applyRows(rows: SyncRow[]) {
    for (const row of rows) {
      if (row.kind === "instance") {
        const rest = this.state.instances.filter((item) => item.id !== row.id);
        this.state = {
          ...this.state,
          instances: row.deleted ? rest : [...rest, row.data as BlockInstance],
        };
      }
      if (row.kind === "reflection") {
        const rest = this.state.reflections.filter((item) => item.id !== row.id);
        this.state = {
          ...this.state,
          reflections: row.deleted ? rest : [...rest, row.data as Reflection],
        };
      }
      if (row.kind === "settings" && !row.deleted) {
        this.state = { ...this.state, settings: { ...this.state.settings, ...(row.data as object) } };
      }
    }
  }

  edit(change: (state: SyncableState) => SyncableState) {
    this.state = change(this.state);
    for (const listener of this.listeners) listener();
  }

  instance(id: string) {
    return this.state.instances.find((item) => item.id === id);
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const planned = makeInstance({
  id: "blk_tpl_a_2026-11-20",
  date: "2026-11-20",
  templateId: "tpl_a",
  updatedAt: STAMP,
});

describe("sync between two devices", () => {
  it("gets a PC's data onto a fresh phone", async () => {
    const server = new FakeServer();
    const pc = new Device(server, { instances: [planned] });
    await pc.engine.start();

    const phone = new Device(server);
    await phone.engine.start();

    expect(phone.instance(planned.id)?.title).toBe(planned.title);
    pc.engine.stop();
    phone.engine.stop();
  });

  it("shows a timer started on the PC on the phone in real time", async () => {
    const server = new FakeServer();
    const pc = new Device(server, { instances: [planned] });
    const phone = new Device(server);
    await pc.engine.start();
    await phone.engine.start();

    pc.edit((state) => ({
      ...state,
      instances: state.instances.map((item) =>
        item.id === planned.id
          ? { ...item, status: "running", startedAt: 1_700_000_000_000, updatedAt: "2026-11-20T10:05:00.000Z" }
          : item,
      ),
    }));
    await settle();

    expect(phone.instance(planned.id)?.status).toBe("running");
    expect(phone.instance(planned.id)?.startedAt).toBe(1_700_000_000_000);
    pc.engine.stop();
    phone.engine.stop();
  });

  it("carries a deletion across", async () => {
    const server = new FakeServer();
    const pc = new Device(server, { instances: [planned] });
    const phone = new Device(server);
    await pc.engine.start();
    await phone.engine.start();

    phone.edit((state) => ({ ...state, instances: [] }));
    await settle();
    expect(pc.instance(planned.id)).toBeUndefined();
    pc.engine.stop();
    phone.engine.stop();
  });

  it("keeps the later edit when both devices change the same block", async () => {
    const server = new FakeServer();
    const pc = new Device(server, { instances: [planned] });
    const phone = new Device(server);
    await pc.engine.start();
    await phone.engine.start();
    server.offline = true;

    pc.edit((state) => ({
      ...state,
      instances: [{ ...planned, note: "dari PC", updatedAt: "2026-11-20T10:10:00.000Z" }],
    }));
    phone.edit((state) => ({
      ...state,
      instances: [{ ...planned, note: "dari HP", updatedAt: "2026-11-20T10:20:00.000Z" }],
    }));
    await settle();

    server.offline = false;
    await pc.engine.sync();
    await phone.engine.sync();
    await pc.engine.sync();

    expect(pc.instance(planned.id)?.note).toBe("dari HP");
    expect(phone.instance(planned.id)?.note).toBe("dari HP");
    pc.engine.stop();
    phone.engine.stop();
  });

  it("asks before mixing two existing plans, and can take the account's", async () => {
    const server = new FakeServer();
    const pc = new Device(server, { instances: [planned] });
    await pc.engine.start();

    const ownPlan = makeInstance({ id: "phone-own", date: "2026-11-20", status: "done", templateId: "tpl_phone" });
    const phone = new Device(server, { instances: [ownPlan] });
    await phone.engine.start();
    expect(phone.engine.snapshot.status).toBe("needs-choice");

    await phone.engine.resolveFirstSync("account");
    expect(phone.state.instances.map((item) => item.id)).toEqual([planned.id]);
    // Taking the account's data never deletes anything on the account.
    expect(server.rows.has(`instance:${planned.id}`)).toBe(true);
    pc.engine.stop();
    phone.engine.stop();
  });
});

import {
  planSync,
  rowHash,
  rowKey,
  toSyncRows,
  type KnownMap,
  type SyncRow,
  type SyncableState,
} from "@/domain/sync";

/**
 * The sync loop. It knows nothing about Supabase, React or IndexedDB: the
 * server sits behind `SyncTransport`, the app behind `SyncAdapter`, and the
 * bookkeeping behind `SyncStateStore`. That is what lets the tests run two
 * "devices" against one fake server in plain node.
 *
 * Latency budget, roughly:
 * - a local edit is pushed after `pushDelayMs` (300 ms by default), so a burst
 *   of keystrokes becomes one write;
 * - the server fans it out over the realtime channel, and the other device
 *   applies that row directly, without waiting for a pull.
 * A started timer therefore shows up on the other screen in well under a
 * second on a normal connection.
 */

/** A row as the server returns it, with the server's own clock for paging. */
export interface RemoteRow extends SyncRow {
  serverAt: string;
}

export interface SyncTransport {
  /** Rows changed on the server after `since` (all rows when `null`). */
  pull(since: string | null): Promise<RemoteRow[]>;
  /** Upserts; the server keeps whichever version has the later `updatedAt`. */
  push(rows: SyncRow[]): Promise<void>;
  /** Live changes from other devices. Returns the unsubscribe. */
  subscribe(onRow: (row: RemoteRow) => void, onState: (live: boolean) => void): () => void;
}

export interface SyncAdapter {
  snapshot(): SyncableState;
  /** Writes winning remote rows into the app. */
  apply(rows: SyncRow[]): Promise<void>;
  /** Called on every local change that might need pushing. */
  onLocalChange(listener: () => void): () => void;
}

export interface PersistedSyncState {
  userId: string;
  /** Highest `serverAt` pulled so far. */
  cursor: string | null;
  known: KnownMap;
}

export interface SyncStateStore {
  load(): PersistedSyncState | null;
  save(state: PersistedSyncState): void;
  clear(): void;
}

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  /** First sign-in on a device that already has its own data. */
  | "needs-choice";

export interface SyncSnapshot {
  status: SyncStatus;
  live: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

export interface SyncEngineOptions {
  userId: string;
  transport: SyncTransport;
  adapter: SyncAdapter;
  state: SyncStateStore;
  now?: () => number;
  pushDelayMs?: number;
  /** Safety-net pull, for a realtime channel that dropped silently. */
  pollMs?: number;
  onSnapshot?: (snapshot: SyncSnapshot) => void;
}

/** Re-pull a few seconds behind the cursor: commits can land out of order. */
const CURSOR_OVERLAP_MS = 5_000;

function hasOwnData(state: SyncableState): boolean {
  return (
    state.instances.some((instance) => instance.status !== "planned" || instance.note.trim() !== "") ||
    state.reflections.length > 0 ||
    state.templates.length > 0
  );
}

function maxServerAt(rows: RemoteRow[], current: string | null): string | null {
  let best = current;
  for (const row of rows) if (best === null || row.serverAt > best) best = row.serverAt;
  return best;
}

function behind(cursor: string | null): string | null {
  if (cursor === null) return null;
  const time = Date.parse(cursor);
  return Number.isFinite(time) ? new Date(time - CURSOR_OVERLAP_MS).toISOString() : cursor;
}

export class SyncEngine {
  private readonly options: Required<Omit<SyncEngineOptions, "onSnapshot">> &
    Pick<SyncEngineOptions, "onSnapshot">;
  private persisted: PersistedSyncState;
  private snapshotValue: SyncSnapshot = { status: "idle", live: false, lastSyncedAt: null, error: null };
  private running = false;
  private again = false;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 2_000;
  private cleanups: Array<() => void> = [];
  private stopped = false;
  /** Rows pulled on a first sign-in, held until the user picks what to keep. */
  private pendingFirst: RemoteRow[] | null = null;

  constructor(options: SyncEngineOptions) {
    this.options = {
      now: () => Date.now(),
      pushDelayMs: 300,
      pollMs: 60_000,
      ...options,
    };
    const saved = options.state.load();
    this.persisted =
      saved && saved.userId === options.userId
        ? saved
        : { userId: options.userId, cursor: null, known: {} };
  }

  get snapshot(): SyncSnapshot {
    return this.snapshotValue;
  }

  private emit(patch: Partial<SyncSnapshot>) {
    this.snapshotValue = { ...this.snapshotValue, ...patch };
    this.options.onSnapshot?.(this.snapshotValue);
  }

  private nowIso() {
    return new Date(this.options.now()).toISOString();
  }

  async start(): Promise<void> {
    const { transport, adapter } = this.options;

    this.cleanups.push(adapter.onLocalChange(() => this.schedulePush()));
    this.cleanups.push(
      transport.subscribe(
        (row) => void this.receive(row),
        (live) => {
          this.emit({ live });
          // Reconnected: whatever happened while the channel was down.
          if (live) void this.sync();
        },
      ),
    );
    if (this.options.pollMs > 0) {
      this.pollTimer = setInterval(() => void this.sync(), this.options.pollMs);
    }

    await this.sync();
  }

  stop(): void {
    this.stopped = true;
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    if (this.pushTimer) clearTimeout(this.pushTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  /** Forgets everything this device agreed with the server. Used on sign-out. */
  forget(): void {
    this.options.state.clear();
  }

  private schedulePush() {
    if (this.stopped || this.snapshotValue.status === "needs-choice") return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.reconcile([]), this.options.pushDelayMs);
  }

  /** A live row from another device: applied at once, no pull round trip. */
  private async receive(row: RemoteRow) {
    if (this.snapshotValue.status === "needs-choice") return;
    const agreed = this.persisted.known[rowKey(row.kind, row.id)];
    // Our own push echoing back.
    if (agreed && agreed.hash === rowHash(row) && agreed.deleted === row.deleted) return;
    await this.reconcile([row]);
  }

  /** Full round: pull what changed, then reconcile both directions. */
  async sync(): Promise<void> {
    if (this.stopped) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    this.emit({ status: "syncing", error: null });
    try {
      const firstTime = Object.keys(this.persisted.known).length === 0;
      const remote = await this.options.transport.pull(behind(this.persisted.cursor));

      if (firstTime && remote.length > 0 && hasOwnData(this.options.adapter.snapshot())) {
        // Both sides already have a plan. Merging blindly would stack two
        // plans on top of each other, so the user decides.
        this.pendingFirst = remote;
        this.emit({ status: "needs-choice" });
        return;
      }

      await this.reconcileRows(remote);
      this.persisted.cursor = maxServerAt(remote, this.persisted.cursor);
      this.options.state.save(this.persisted);
      this.retryDelay = 2_000;
      this.emit({ status: "synced", lastSyncedAt: this.options.now() });
    } catch (error) {
      this.fail(error);
    } finally {
      this.running = false;
      if (this.again) {
        this.again = false;
        void this.sync();
      }
    }
  }

  /**
   * The first sign-in on a device that has its own data.
   *
   * - `account` takes the account's data and drops this device's own plan,
   *   which is what a new phone joining a PC wants;
   * - `merge` keeps both, newest version of each row winning.
   */
  async resolveFirstSync(choice: "account" | "merge"): Promise<void> {
    const remote = this.pendingFirst;
    if (!remote) return;
    this.pendingFirst = null;
    this.emit({ status: "syncing" });
    try {
      if (choice === "account") {
        const local = toSyncRows(this.options.adapter.snapshot(), this.nowIso());
        const remoteKeys = new Set(remote.map((row) => rowKey(row.kind, row.id)));
        // Everything the account does not have is removed here, and treated as
        // already agreed so the removal is not pushed back up.
        const removals: SyncRow[] = local
          .filter((row) => !remoteKeys.has(rowKey(row.kind, row.id)))
          .filter((row) => row.kind !== "settings" && row.kind !== "stabilo" && row.kind !== "customTemplates")
          .map((row) => ({ ...row, data: null, deleted: true }));
        const known: KnownMap = {};
        for (const row of remote) {
          known[rowKey(row.kind, row.id)] = {
            hash: rowHash(row),
            updatedAt: row.updatedAt,
            deleted: row.deleted,
          };
        }
        this.persisted.known = known;
        await this.options.adapter.apply([...remote.filter((row) => !row.deleted), ...removals]);
      } else {
        await this.reconcileRows(remote);
      }
      this.persisted.cursor = maxServerAt(remote, this.persisted.cursor);
      this.options.state.save(this.persisted);
      this.emit({ status: "synced", lastSyncedAt: this.options.now() });
      // Anything the apply changed locally (deduplication) goes up now.
      this.schedulePush();
    } catch (error) {
      this.fail(error);
    }
  }

  private async reconcile(remote: SyncRow[]) {
    if (this.stopped) return;
    if (this.running) {
      // A full sync is in flight; it reads local state at the end anyway.
      this.again = true;
      return;
    }
    this.running = true;
    try {
      await this.reconcileRows(remote);
      this.options.state.save(this.persisted);
      this.emit({ status: "synced", lastSyncedAt: this.options.now(), error: null });
    } catch (error) {
      this.fail(error);
    } finally {
      this.running = false;
      if (this.again) {
        this.again = false;
        void this.sync();
      }
    }
  }

  private async reconcileRows(remote: SyncRow[]) {
    const { adapter, transport } = this.options;
    const now = this.nowIso();
    const plan = planSync({
      local: toSyncRows(adapter.snapshot(), now),
      remote,
      known: this.persisted.known,
      now,
    });

    const before = this.persisted.known;
    // Agree first: applying triggers a local-change event, and that event must
    // find nothing new to push.
    this.persisted.known = plan.known;

    if (plan.apply.length > 0) await adapter.apply(plan.apply);

    if (plan.push.length > 0) {
      try {
        await transport.push(plan.push);
      } catch (error) {
        // Not pushed means not agreed: roll those keys back so the next round
        // tries again instead of believing the server has them.
        for (const row of plan.push) {
          const key = rowKey(row.kind, row.id);
          if (before[key]) this.persisted.known[key] = before[key];
          else delete this.persisted.known[key];
        }
        throw error;
      }
    }
  }

  private fail(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    this.emit({ status: offline ? "offline" : "error", error: message });
    if (this.stopped) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => void this.sync(), this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 60_000);
  }
}

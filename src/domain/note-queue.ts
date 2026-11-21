/**
 * The write queue behind block notes.
 *
 * Notes are saved on a 400 ms debounce, so the interesting question is not how
 * a note is written but what happens when a write fails. Before this module the
 * answer was "nothing": the batch was taken off the dirty set *before* the
 * write, so a failed `bulkPut` (a full quota, a locked database) dropped the
 * text until the user happened to type again in that same block.
 *
 * The rule now lives here, with no storage and no timers, so it can be tested
 * in a plain node environment. The store owns the scheduling.
 */

export type NoteWriteFailure = "quota" | "unavailable" | "unknown";

/**
 * How long before a failed write is tried again. A full quota does not free
 * itself in five seconds, so that failure is queued but never retried on a
 * timer — it waits for the next edit or an explicit save instead of spinning.
 */
export const NOTE_RETRY_MS = 5_000;

export class NoteQueue {
  private readonly dirty = new Set<string>();

  /** A note changed. Idempotent: typing twice in one block queues it once. */
  mark(id: string): void {
    this.dirty.add(id);
  }

  get size(): number {
    return this.dirty.size;
  }

  /** Ids still waiting to be written, oldest insertion order. */
  pending(): string[] {
    return [...this.dirty];
  }

  /**
   * Takes everything that is due. The caller owns these ids until it reports
   * the outcome with `restore`; anything marked while the write is in flight
   * stays queued for the next round.
   */
  take(): string[] {
    const ids = [...this.dirty];
    this.dirty.clear();
    return ids;
  }

  /**
   * A failed write goes back into the queue, so the next attempt writes the
   * newest text rather than the batch that failed. Returns the delay before
   * that attempt, or `null` when retrying on a timer would only spin.
   */
  restore(ids: readonly string[], failure: NoteWriteFailure): number | null {
    for (const id of ids) this.dirty.add(id);
    return failure === "quota" ? null : NOTE_RETRY_MS;
  }
}

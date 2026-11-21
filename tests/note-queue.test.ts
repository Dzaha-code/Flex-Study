import { describe, expect, it } from "vitest";
import { NoteQueue, NOTE_RETRY_MS } from "@/domain/note-queue";

describe("NoteQueue", () => {
  it("queues a block once however often it is typed in", () => {
    const queue = new NoteQueue();
    queue.mark("a");
    queue.mark("a");
    queue.mark("b");

    expect(queue.size).toBe(2);
    expect(queue.pending()).toEqual(["a", "b"]);
  });

  it("hands the batch over and starts empty", () => {
    const queue = new NoteQueue();
    queue.mark("a");
    queue.mark("b");

    expect(queue.take()).toEqual(["a", "b"]);
    expect(queue.size).toBe(0);
  });

  it("keeps text typed while a write was in flight", () => {
    const queue = new NoteQueue();
    queue.mark("a");

    const inFlight = queue.take();
    queue.mark("a");
    queue.mark("b");

    expect(inFlight).toEqual(["a"]);
    expect(queue.pending()).toEqual(["a", "b"]);
  });

  it("puts a failed batch back on the queue instead of losing it", () => {
    const queue = new NoteQueue();
    queue.mark("a");
    const batch = queue.take();

    const retryIn = queue.restore(batch, "unknown");

    expect(queue.pending()).toEqual(["a"]);
    expect(retryIn).toBe(NOTE_RETRY_MS);
  });

  it("never retries a full quota on a timer, but keeps the text queued", () => {
    const queue = new NoteQueue();
    queue.mark("a");
    const batch = queue.take();

    const retryIn = queue.restore(batch, "quota");

    expect(retryIn).toBeNull();
    expect(queue.pending()).toEqual(["a"]);
  });

  it("does not queue the same block twice when a retry overlaps a new edit", () => {
    const queue = new NoteQueue();
    queue.mark("a");
    const batch = queue.take();

    queue.mark("a");
    queue.restore(batch, "unavailable");

    expect(queue.pending()).toEqual(["a"]);
  });
});

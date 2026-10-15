import { describe, expect, it } from "vitest";
import { createSequentialIdFactory } from "@/domain/ids";
import {
  countWords,
  hasContent,
  LEARNING_SLOTS,
  makeReflection,
  normalizeLearnings,
  promptIdForDate,
  reflectionMatches,
  reflectionPreview,
} from "@/domain/reflection";
import { makeInstance } from "./helpers";

const DAY = "2026-10-14";
const NOW = new Date(2026, 9, 14, 20, 0).getTime();

describe("countWords", () => {
  it("counts words in both shipped languages", () => {
    expect(countWords("Hari ini saya belajar dua bab.")).toBe(6);
    expect(countWords("Today I finished two chapters.")).toBe(5);
  });

  it("ignores surrounding whitespace and bare punctuation", () => {
    expect(countWords("   ")).toBe(0);
    expect(countWords("halo — dunia")).toBe(2);
  });
});

describe("learnings", () => {
  it("always returns exactly three trimmed slots", () => {
    const learnings = normalizeLearnings(["  satu  ", "dua"]);
    expect(learnings).toHaveLength(LEARNING_SLOTS);
    expect(learnings).toEqual(["satu", "dua", ""]);
  });
});

describe("prompts", () => {
  it("is stable for a given date", () => {
    expect(promptIdForDate(DAY)).toBe(promptIdForDate(DAY));
  });

  it("rotates across the week", () => {
    const week = ["2026-10-12", "2026-10-13", DAY, "2026-10-15", "2026-10-16"];
    const unique = new Set(week.map((date) => promptIdForDate(date)));
    expect(unique.size).toBe(week.length);
  });
});

describe("makeReflection", () => {
  it("creates a row with a word count and an id", () => {
    const reflection = makeReflection({
      date: DAY,
      title: "  Hari yang berantakan  ",
      body: "Dua bab selesai, satu bab tertunda.",
      learnings: ["bangun lebih pagi"],
      promptId: "reflection.prompt.win",
      now: NOW,
      newId: createSequentialIdFactory(),
    });

    expect(reflection.id).toMatch(/^refl_/);
    // "Dua bab selesai, satu bab tertunda." is six words.
    expect(reflection.wordCount).toBe(6);
    expect(reflection.learnings).toHaveLength(LEARNING_SLOTS);
    expect(reflection.schemaVersion).toBe(1);
    expect(reflection.title).toBe("Hari yang berantakan");
  });

  it("keeps the original creation time when the entry is edited", () => {
    const created = makeReflection({
      date: DAY,
      title: "",
      body: "awal",
      learnings: [],
      promptId: null,
      now: NOW,
      newId: createSequentialIdFactory(),
    });

    const edited = makeReflection({
      date: DAY,
      title: "",
      body: "awal yang sudah diedit",
      learnings: [],
      promptId: null,
      existing: created,
      now: NOW + 60_000,
      newId: createSequentialIdFactory(),
    });

    expect(edited.id).toBe(created.id);
    expect(edited.createdAt).toBe(created.createdAt);
    expect(edited.wordCount).toBe(4);
  });
});

describe("favourites", () => {
  it("survives an edit that never mentions the star", () => {
    const starred = makeReflection({
      date: DAY,
      title: "Hari yang bagus",
      body: "awal",
      learnings: [],
      promptId: null,
      favorite: true,
      now: NOW,
      newId: createSequentialIdFactory(),
    });

    // The editor does not send `favorite`, so saving text must not clear it.
    const edited = makeReflection({
      date: DAY,
      title: "Hari yang bagus",
      body: "awal yang sudah diedit",
      learnings: [],
      promptId: null,
      existing: starred,
      now: NOW + 60_000,
      newId: createSequentialIdFactory(),
    });

    expect(starred.favorite).toBe(true);
    expect(edited.favorite).toBe(true);
  });

  it("starts unstarred", () => {
    const reflection = makeReflection({
      date: DAY,
      title: "",
      body: "awal",
      learnings: [],
      promptId: null,
      now: NOW,
      newId: createSequentialIdFactory(),
    });

    expect(reflection.favorite).toBe(false);
  });
});

describe("reflectionMatches", () => {
  const reflection = makeReflection({
    date: DAY,
    title: "Minggu yang tenang",
    body: "Dua bab selesai.",
    learnings: ["bangun lebih pagi"],
    promptId: null,
    now: NOW,
    newId: createSequentialIdFactory(),
  });

  it("matches everything when the query is empty", () => {
    expect(reflectionMatches(reflection, "   ")).toBe(true);
  });

  it("finds the title, the body, a take-away and the date", () => {
    expect(reflectionMatches(reflection, "tenang")).toBe(true);
    expect(reflectionMatches(reflection, "dua bab")).toBe(true);
    expect(reflectionMatches(reflection, "bangun")).toBe(true);
    expect(reflectionMatches(reflection, DAY)).toBe(true);
  });

  it("ignores case, and rejects what is not written", () => {
    expect(reflectionMatches(reflection, "TENANG")).toBe(true);
    expect(reflectionMatches(reflection, "kimia organik")).toBe(false);
  });
});

describe("editor helpers", () => {
  it("treats a note-only or learning-only entry as content", () => {
    expect(hasContent({ body: "", learnings: ["", "", ""] })).toBe(false);
    expect(hasContent({ body: "  ", learnings: ["", "sesuatu", ""] })).toBe(true);
  });

  it("collapses a preview onto one line", () => {
    expect(reflectionPreview("baris satu\n\nbaris dua")).toBe("baris satu baris dua");
    expect(reflectionPreview("x".repeat(120)).endsWith("…")).toBe(true);
  });

  it("keeps instance builders independent of reflections", () => {
    expect(makeInstance({ id: "x", date: DAY }).status).toBe("planned");
  });
});

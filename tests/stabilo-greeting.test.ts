import { describe, expect, it } from "vitest";
import { validateScript } from "@/features/stabilo/engine/dialogue";
import type { DialogueNode } from "@/features/stabilo/engine/types";
import {
  buildGreeting,
  dayNumber,
  rotate,
  slotFor,
  type GreetingContext,
} from "@/features/stabilo/script/greeting";

const BASE: GreetingContext = {
  lang: "id",
  date: "2026-11-20",
  hour: 8,
  weekday: 5,
  blocksToday: 4,
  firstBlock: "Kerja mendalam",
  plannedYesterday: 0,
  doneYesterday: 0,
  journalStreak: 0,
  firstTime: false,
};

/** The lines in the order she says them. */
function spoken(context: GreetingContext): string[] {
  const script = buildGreeting(context);
  const lines: string[] = [];
  let id: string | undefined = script.start;
  while (id) {
    const node: DialogueNode | undefined = script.nodes[id];
    if (!node) break;
    lines.push(node.text);
    id = node.next;
  }
  return lines;
}

describe("daily greeting", () => {
  it("is a valid script in both languages", () => {
    for (const lang of ["id", "en"] as const) {
      expect(validateScript(buildGreeting({ ...BASE, lang }))).toEqual([]);
    }
  });

  it("follows the time of day", () => {
    expect(slotFor(7)).toBe("morning");
    expect(slotFor(12)).toBe("noon");
    expect(slotFor(16)).toBe("afternoon");
    expect(slotFor(21)).toBe("evening");
    expect(slotFor(2)).toBe("evening");
    expect(spoken(BASE)[0]).toMatch(/pagi/i);
    // Every hello names its part of the day, whichever one the date picks.
    for (let day = 1; day <= 6; day += 1) {
      const date = `2026-11-0${day}`;
      expect(spoken({ ...BASE, date, hour: 20 })[0]).toMatch(/malam/i);
      expect(spoken({ ...BASE, date, hour: 12 })[0]).toMatch(/siang/i);
      expect(spoken({ ...BASE, date, hour: 16 })[0]).toMatch(/sore/i);
      expect(spoken({ ...BASE, date, lang: "en", hour: 20 })[0]).toMatch(/evening/i);
    }
  });

  it("encourages differently on consecutive days, and the same on the same day", () => {
    const cheers = Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(Date.UTC(2026, 10, 1 + offset)).toISOString().slice(0, 10);
      return buildGreeting({ ...BASE, date, weekday: 2 }).nodes["g-cheer"]?.text;
    });
    for (let index = 1; index < cheers.length; index += 1) {
      expect(cheers[index]).not.toBe(cheers[index - 1]);
    }
    // Two weeks of days, fourteen different lines.
    expect(new Set(cheers).size).toBe(14);
    expect(buildGreeting(BASE).nodes["g-cheer"]?.text).toBe(
      buildGreeting({ ...BASE, hour: 22 }).nodes["g-cheer"]?.text,
    );
  });

  it("rotates through every index before repeating", () => {
    const seen = new Set(Array.from({ length: 6 }, (_, day) => rotate(day, 6)));
    expect(seen.size).toBe(6);
    expect(dayNumber("1970-01-02")).toBe(1);
  });

  it("talks about the actual day", () => {
    expect(spoken(BASE).join(" ")).toContain("4 blok");
    expect(spoken(BASE).join(" ")).toContain("Kerja mendalam");
    expect(spoken({ ...BASE, blocksToday: 0, firstBlock: null }).join(" ")).toContain("masih kosong");
    expect(spoken({ ...BASE, plannedYesterday: 3, doneYesterday: 3 }).join(" ")).toContain("semua 3 blok");
    expect(spoken({ ...BASE, plannedYesterday: 3, doneYesterday: 0 }).join(" ")).toContain("berat");
    expect(spoken({ ...BASE, journalStreak: 5 }).join(" ")).toContain("5 hari berturut-turut");
  });

  it("names the weekday only when it has something to say", () => {
    expect(buildGreeting({ ...BASE, weekday: 5 }).nodes["g-weekday"]).toBeDefined();
    expect(buildGreeting({ ...BASE, weekday: 3 }).nodes["g-weekday"]).toBeUndefined();
  });

  it("explains how to turn it off only the first time", () => {
    expect(spoken({ ...BASE, firstTime: true }).join(" ")).toContain("Atur → Stabilo");
    expect(spoken(BASE).join(" ")).not.toContain("Atur → Stabilo");
  });

  it("keeps a teasing hello for the spooky temperament", () => {
    expect(buildGreeting(BASE).nodes["g-hello"]?.mode?.spooky).toMatch(/menunggu/);
  });
});

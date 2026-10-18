import { describe, expect, it } from "vitest";
import { DEFAULT_STABILO_PREFS } from "@/domain/types";
import { StabiloPrefsSchema } from "@/data/schema";
import { fillsScreen, resolveContentWidth, type WindowMetrics } from "@/lib/viewport";

const metrics = (
  viewportWidth: number,
  viewportHeight: number,
  availWidth = 1920,
  availHeight = 1040,
): WindowMetrics => ({ viewportWidth, viewportHeight, availWidth, availHeight });

describe("fillsScreen", () => {
  /**
   * The client area is never exactly the work area: the title bar takes ~31 px
   * and a scrollbar another ~15. An exact comparison would report "not
   * maximised" on every real maximised window, which is the bug this guards.
   */
  it("accepts the title bar and scrollbar it cannot measure", () => {
    expect(fillsScreen(metrics(1905, 1009))).toBe(true);
  });

  it("rejects a restored window", () => {
    expect(fillsScreen(metrics(1100, 740))).toBe(false);
  });

  it("rejects a window that only fills one dimension", () => {
    expect(fillsScreen(metrics(1905, 700))).toBe(false);
  });

  it("never claims anything without a screen", () => {
    expect(fillsScreen(metrics(0, 0, 0, 0))).toBe(false);
  });
});

describe("resolveContentWidth", () => {
  it("uses the whole window while it fills the screen", () => {
    expect(resolveContentWidth("comfortable", true)).toBe("full");
    expect(resolveContentWidth("wide", true)).toBe("full");
  });

  /** The preference is not overwritten: restoring the window returns to it. */
  it("returns to the stored preference once restored", () => {
    expect(resolveContentWidth("comfortable", false)).toBe("comfortable");
  });
});

describe("StabiloPrefs.forceMotion", () => {
  it("is off for a fresh install, so the system preference still wins", () => {
    expect(DEFAULT_STABILO_PREFS.forceMotion).toBe(false);
  });

  /** A row written before the override existed must not fail the parse. */
  it("reads as off from a row that predates it", () => {
    const parsed = StabiloPrefsSchema.parse({
      enabled: true,
      intensity: "spooky",
      fx: true,
      sound: "normal",
      nickname: "",
      introSeen: true,
      tourDone: true,
      ph3Seen: 0,
      progress: null,
    });
    expect(parsed.forceMotion).toBe(false);
  });

  it("survives a round trip once switched on", () => {
    const parsed = StabiloPrefsSchema.parse({
      ...DEFAULT_STABILO_PREFS,
      forceMotion: true,
    });
    expect(parsed.forceMotion).toBe(true);
  });
});

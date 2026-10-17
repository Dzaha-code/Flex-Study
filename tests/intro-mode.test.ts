import { describe, expect, it } from "vitest";
import { DEFAULT_INTRO_MODE, resolveIntroPhase } from "@/features/intro/intro-mode";
import { DEFAULT_SETTINGS } from "@/domain/types";

/**
 * The gate itself reads `localStorage` and renders React, so it is not testable
 * here. Everything it decides with lives in `resolveIntroPhase`, and this is
 * where the three preferences and the replay request are pinned down.
 */
describe("resolveIntroPhase", () => {
  it("only plays once by default, and the flag is what stops it", () => {
    expect(resolveIntroPhase(DEFAULT_INTRO_MODE, false)).toBe("run");
    expect(resolveIntroPhase("once", true)).toBe("done");
  });

  it("plays on every launch in `always`, seen flag or not", () => {
    expect(resolveIntroPhase("always", false)).toBe("run");
    expect(resolveIntroPhase("always", true)).toBe("run");
  });

  it("never plays in `off`, not even on the very first launch", () => {
    expect(resolveIntroPhase("off", false)).toBe("done");
    expect(resolveIntroPhase("off", true)).toBe("done");
  });

  it("lets a requested replay outrank the preference", () => {
    // "Play now" has to work for someone whose mode is `off`; that is the whole
    // reason the request flag exists.
    expect(resolveIntroPhase("off", true, true)).toBe("run");
    expect(resolveIntroPhase("once", true, true)).toBe("run");
    expect(resolveIntroPhase("always", true, true)).toBe("run");
  });

  it("defaults to the shipped behaviour, not to silence", () => {
    // The opening animation plays on every launch by default; it is never the
    // silent option, and the pre-hydration constant must agree with the store.
    expect(DEFAULT_SETTINGS.intro).toBe("always");
    expect(DEFAULT_INTRO_MODE).toBe(DEFAULT_SETTINGS.intro);
  });
});

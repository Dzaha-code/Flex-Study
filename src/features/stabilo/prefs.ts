import { DEFAULT_STABILO_PREFS } from "@/domain/types";
import type { StabiloIntensity, StabiloPrefs } from "@/domain/types";

export type { StabiloPrefs };
export { DEFAULT_STABILO_PREFS };

/** Intensity offered in the interface. `full` only appears with the flag on. */
export function offeredIntensities(fullHorror: boolean): StabiloIntensity[] {
  return fullHorror ? ["sweet", "spooky", "full"] : ["sweet", "spooky"];
}

/** Fills in anything a row written by an older build is missing. */
export function withDefaults(saved: Partial<StabiloPrefs> | undefined | null): StabiloPrefs {
  if (!saved) return { ...DEFAULT_STABILO_PREFS };
  return { ...DEFAULT_STABILO_PREFS, ...saved };
}

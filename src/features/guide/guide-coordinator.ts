"use client";

import type { Flow } from "@/features/stabilo/script";
import { closeStabilo, openStabilo } from "@/features/stabilo/stabilo-store";
import { closeTour, startTour } from "@/features/tour/tour-store";

/**
 * One walkthrough at a time.
 *
 * There are two presenters of the same tour: the character and the classic
 * card. They used to open independently, and two independent overlays on one
 * screen is not a styling problem — it is two scrims, two spotlights, and two
 * `keydown` handlers, so pressing Enter advanced both and every click landed on
 * whichever happened to be on top.
 *
 * The rule lives here rather than inside either store so neither has to import
 * the other. Every entry point — the guide page, Settings, the first-run flow,
 * the sprite-failure fallback — goes through this module, which makes
 * "both open" impossible to reach by accident.
 */

export function showStabilo(flow: Flow): void {
  closeTour();
  openStabilo(flow);
}

export function showClassicTour(): void {
  closeStabilo();
  startTour();
}

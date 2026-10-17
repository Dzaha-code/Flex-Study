/**
 * Asset contract for the character. Nothing here exists yet — see
 * `public/stabilo/README.md` once artwork lands. The filenames are fixed now so
 * the art can be dropped in without touching code.
 *
 * Rules from tourStabilo.md §5.1: transparent WebP, one canvas and one anchor
 * point for every view (800×960), so swapping a sprite never makes her jump.
 */
export const STABILO_ASSET_DIR = "/stabilo";

export const STABILO_ASSETS = {
  flat: `${STABILO_ASSET_DIR}/stabilo_flat.webp`,
  mouthClosed: `${STABILO_ASSET_DIR}/stabilo_mouth_closed_speak.webp`,
  mouthOpen: `${STABILO_ASSET_DIR}/stabilo_mouth_open_speak.webp`,
  blink: `${STABILO_ASSET_DIR}/stabilo_blink.webp`,
  scary: `${STABILO_ASSET_DIR}/stabilo_scarySmile.webp`,
  /** The accent smile with her eyes shut — the "held a beat too long" frame. */
  scaryClose: `${STABILO_ASSET_DIR}/stabilo_scarySmile_CloseEyes.webp`,
  ph1: `${STABILO_ASSET_DIR}/stabilo_scarySmile_ph1.webp`,
  ph2: `${STABILO_ASSET_DIR}/stabilo_scarySmile_ph2.webp`,
  ph3: `${STABILO_ASSET_DIR}/stabilo_scarySmile_ph3.webp`,
  // Registered so the contract is complete, but never referenced while
  // STABILO_FULL_HORROR is false.
  ph4: `${STABILO_ASSET_DIR}/stabilo_scarySmile_ph4.webp`,
  ph5: `${STABILO_ASSET_DIR}/stabilo_scarySmile_ph5.webp`,
} as const;

export type SpriteKey = keyof typeof STABILO_ASSETS;

/** Without these four there is no character, only holes. */
export const CORE_SPRITES: SpriteKey[] = ["flat", "mouthClosed", "mouthOpen", "blink"];

export function spriteUrl(key: SpriteKey): string {
  return STABILO_ASSETS[key];
}

/**
 * Resolves `true` when every core sprite decodes. `new Image()` is the cheapest
 * honest check: a fetch would download the bytes twice, and a HEAD request would
 * not prove the file is a usable image.
 */
export function probeSprite(url: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

export async function probeCoreSprites(): Promise<boolean> {
  const results = await Promise.all(CORE_SPRITES.map((key) => probeSprite(spriteUrl(key))));
  return results.every(Boolean);
}

/** Phase sprites are only fetched once the tour starts, never at boot. */
export function prefetchPhaseSprites(): void {
  if (typeof window === "undefined") return;
  for (const key of ["scary", "ph1", "ph2", "ph3"] as SpriteKey[]) {
    void probeSprite(spriteUrl(key));
  }
}

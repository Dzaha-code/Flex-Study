"use client";

import { useState } from "react";
import type { Mouth } from "../engine/typewriter";
import { spriteUrl, type SpriteKey } from "../assets";

/**
 * The character drawing.
 *
 * With no artwork in the repository yet, a labelled silhouette stands in during
 * development. In production a missing sprite means she is not shown at all —
 * a broken image would be worse than an absent character, and the classic tour
 * keeps working without her.
 */
export function Sprite({
  sprite,
  mouth,
  placeholder,
  onMissing,
}: {
  sprite: SpriteKey;
  /** Only `flat` has lip frames; phase sprites are stills. */
  mouth: Mouth;
  placeholder: boolean;
  onMissing: () => void;
}) {
  const key: SpriteKey = sprite === "flat" && mouth === "open" ? "mouthOpen" : sprite;
  /**
   * Remembered per sprite rather than as a boolean with an effect: a failure on
   * one frame says nothing about the next one, and keying it avoids a setState
   * inside an effect.
   */
  const [brokenKey, setBrokenKey] = useState<string | null>(null);
  const broken = brokenKey === key;

  // Production shows nothing rather than a hole; development shows a labelled
  // silhouette so a missing file is obvious instead of invisible.
  if (broken && !placeholder) return null;

  if (broken) {
    return (
      <div aria-hidden="true" className="relative flex h-full w-full items-end justify-center">
        <svg
          viewBox="0 0 200 260"
          className="h-full w-auto text-line-strong"
          role="presentation"
        >
          <ellipse cx="100" cy="72" rx="46" ry="52" fill="none" stroke="currentColor" strokeDasharray="5 5" />
          <path
            d="M28 258c0-40 32-68 72-68s72 28 72 68"
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 5"
          />
          <circle cx="84" cy="70" r="3.2" fill="currentColor" />
          <circle cx="116" cy="70" r="3.2" fill="currentColor" />
        </svg>
        <span className="absolute bottom-1 rounded-full bg-surface-raised px-2 py-0.5 text-caption text-mute">
          {key}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized
    <img
      src={spriteUrl(key)}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => {
        setBrokenKey(key);
        if (!placeholder) onMissing();
      }}
      className="h-full w-auto select-none object-contain object-bottom"
    />
  );
}

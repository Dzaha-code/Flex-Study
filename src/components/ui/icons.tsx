import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarBlank,
  Check,
  DownloadSimple,
  Gear,
  Info,
  Note,
  PencilSimple,
  Play,
  Plus,
  Shuffle,
  SkipForward,
  Sun,
  Trash,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react/ssr";
import type { ComponentType } from "react";
import { CATEGORY_SYMBOLS, type CategorySymbol } from "@/domain/types";
import { cn } from "@/lib/utils";

/**
 * Icons come from Phosphor (DESIGN.md §9) so stroke weight and optical sizing
 * stay consistent without maintaining a hand-rolled set.
 *
 * Two things are deliberately not Phosphor icons:
 *  - category markers, which are geometric characters (§3.3), and
 *  - the nav glyphs, which are also geometric (§4).
 */
type PhosphorIcon = ComponentType<{
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
  "aria-hidden"?: boolean;
}>;

interface IconProps {
  size?: number;
  /** Accepted so existing call sites that pass dimensions keep working. */
  width?: number;
  height?: number;
  className?: string;
}

function icon(Glyph: PhosphorIcon, weight: "regular" | "fill" = "regular") {
  return function Icon({ size, width, height, className }: IconProps) {
    return (
      <Glyph
        size={size ?? width ?? height ?? 20}
        weight={weight}
        className={className}
        aria-hidden={true}
      />
    );
  };
}

export const IconPlay = icon(Play, "fill");
export const IconCheck = icon(Check);
export const IconUndo = icon(ArrowCounterClockwise);
export const IconSkip = icon(SkipForward);
export const IconNote = icon(Note);
export const IconPencil = icon(PencilSimple);
export const IconShuffle = icon(Shuffle);
export const IconArrowLeft = icon(ArrowLeft);
export const IconArrowRight = icon(ArrowRight);
export const IconArrowUp = icon(ArrowUp);
export const IconArrowDown = icon(ArrowDown);
export const IconPlus = icon(Plus);
export const IconTrash = icon(Trash);
export const IconClose = icon(X);
export const IconWarning = icon(Warning);
export const IconClock = icon(CalendarBlank);
export const IconInfo = icon(Info);
export const IconDownload = icon(DownloadSimple);
export const IconUpload = icon(UploadSimple);
export const IconSettings = icon(Gear);
export const IconSun = icon(Sun);
export const IconCalendar = icon(CalendarBlank);

/* ---------------------------------------------------------------------------
 * Category markers — geometric characters, never colour (DESIGN.md §3.3).
 * ------------------------------------------------------------------------- */

export const SYMBOL_GLYPHS: Record<CategorySymbol, string> = {
  disc: "●",
  square: "■",
  diamond: "◆",
  triangle: "▲",
  ring: "○",
  "square-open": "□",
  "diamond-open": "◇",
  "triangle-open": "△",
  star: "★",
  plus: "✚",
};

export const CATEGORY_GLYPH_IDS: CategorySymbol[] = [...CATEGORY_SYMBOLS];

/** Kept so callers written against the pre-v2 name still resolve. */
export const CATEGORY_ICON_IDS = CATEGORY_GLYPH_IDS;

/**
 * The marker is a text character at `caption` size, in `--mute`, and always
 * sits next to the category name — the name carries the meaning if the glyph
 * is hard to distinguish.
 */
export function CategoryGlyph({ icon: symbol, className }: { icon: CategorySymbol; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("text-caption leading-none", className)}>
      {SYMBOL_GLYPHS[symbol] ?? SYMBOL_GLYPHS.disc}
    </span>
  );
}

/** Nav glyphs (§4): geometric characters, not icons. */
export const NAV_GLYPHS = {
  today: "◐",
  week: "▦",
  journal: "✎",
  settings: "◑",
} as const;

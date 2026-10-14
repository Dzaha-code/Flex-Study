import type { ReactElement, SVGProps } from "react";
import type { CategoryIcon } from "@/domain/types";

/**
 * A small hand-rolled icon set.
 *
 * Icons are inline SVG rather than an icon package: it keeps the bundle tiny,
 * avoids a runtime dependency, and lets every icon inherit `currentColor` and
 * the same stroke weight so the timeline stays visually quiet.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconPlay = (props: IconProps) => (
  <Base {...props}>
    <path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />
  </Base>
);

export const IconCheck = (props: IconProps) => (
  <Base {...props}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Base>
);

export const IconUndo = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 9h10a5 5 0 0 1 0 10H8" />
    <path d="m4 9 4-4M4 9l4 4" />
  </Base>
);

export const IconSkip = (props: IconProps) => (
  <Base {...props}>
    <path d="M6 5.5v13l8-6.5z" fill="currentColor" stroke="none" />
    <path d="M17.5 5.5v13" />
  </Base>
);

export const IconNote = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 4.5h9.5L19 9v10.5H5z" />
    <path d="M14 4.5V9h4.5" />
    <path d="M8.5 13h7M8.5 16.5h4.5" />
  </Base>
);

export const IconShuffle = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 7h3.5l3 5 3-5H20" />
    <path d="M4 17h3.5l3-5" />
    <path d="m17.5 4.5 2.5 2.5-2.5 2.5" />
    <path d="m17.5 14.5 2.5 2.5-2.5 2.5" />
  </Base>
);

export const IconArrowLeft = (props: IconProps) => (
  <Base {...props}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Base>
);

export const IconArrowRight = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Base>
);

export const IconArrowUp = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </Base>
);

export const IconArrowDown = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 5v14" />
    <path d="m6 13 6 6 6-6" />
  </Base>
);

export const IconPlus = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconTrash = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 7h14" />
    <path d="M9.5 7V4.5h5V7" />
    <path d="M6.5 7l1 12.5h9L17.5 7" />
  </Base>
);

export const IconClose = (props: IconProps) => (
  <Base {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Base>
);

export const IconWarning = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 4.5 21 19.5H3z" />
    <path d="M12 10v4.5M12 17.2v.3" />
  </Base>
);

export const IconInfo = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.3" />
  </Base>
);

export const IconDownload = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 4v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M5 19.5h14" />
  </Base>
);

export const IconUpload = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 15V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M5 19.5h14" />
  </Base>
);

export const IconSettings = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.8l1.9 1.1M17.2 15.1l1.9 1.1M4.9 16.2l1.9-1.1M17.2 8.9l1.9-1.1" />
  </Base>
);

export const IconSun = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2.2M12 18.8V21M4.2 12H6.4M17.6 12h2.2M6.5 6.5l1.6 1.6M15.9 15.9l1.6 1.6M6.5 17.5l1.6-1.6M15.9 8.1l1.6-1.6" />
  </Base>
);

export const IconCalendar = (props: IconProps) => (
  <Base {...props}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4" />
  </Base>
);

/* Category icons: categories are told apart by shape, not by colour. */

export const IconBook = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 4.5h6v15H5zM13 4.5h6v15h-6z" />
  </Base>
);

export const IconBriefcase = (props: IconProps) => (
  <Base {...props}>
    <rect x="3.5" y="7.5" width="17" height="11" rx="2" />
    <path d="M9 7.5V5.5h6v2" />
    <path d="M3.5 12.5h17" />
  </Base>
);

export const IconNotebook = (props: IconProps) => (
  <Base {...props}>
    <rect x="5" y="4" width="14" height="16" rx="2" />
    <path d="M8.5 4v16" />
    <path d="M12 9.5h4M12 13h4" />
  </Base>
);

export const IconLanguage = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 6h9M8.5 6v1.5c0 4-2 6.5-4.5 8" />
    <path d="M6 10.5c1.5 2.5 3.6 4.2 6 5" />
    <path d="m12.5 20 4-10 4 10M14.2 16.5h4.6" />
  </Base>
);

export const IconHeart = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 19.5c-4.5-3-7-5.6-7-8.9A4 4 0 0 1 12 8a4 4 0 0 1 7 2.6c0 3.3-2.5 5.9-7 8.9z" />
  </Base>
);

export const IconRun = (props: IconProps) => (
  <Base {...props}>
    <circle cx="14.5" cy="5.5" r="2" />
    <path d="m11 21 1.5-5-3-2.5L10 9l4 1.5 2.5 2.5" />
    <path d="m8 12 2.5-3" />
  </Base>
);

export const IconSparkle = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9z" />
  </Base>
);

export const IconClock = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Base>
);

const CATEGORY_ICONS: Record<CategoryIcon, (props: IconProps) => ReactElement> = {
  book: IconBook,
  briefcase: IconBriefcase,
  notebook: IconNotebook,
  language: IconLanguage,
  heart: IconHeart,
  run: IconRun,
  sparkle: IconSparkle,
  clock: IconClock,
};

export const CATEGORY_ICON_IDS: CategoryIcon[] = [
  "book",
  "briefcase",
  "notebook",
  "language",
  "heart",
  "run",
  "sparkle",
  "clock",
];

export function CategoryGlyph({ icon, ...props }: IconProps & { icon: CategoryIcon }) {
  const Component = CATEGORY_ICONS[icon] ?? IconSparkle;
  return <Component {...props} />;
}

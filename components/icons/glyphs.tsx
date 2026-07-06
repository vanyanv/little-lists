import type { CSSProperties } from "react";

/**
 * The single glyph registry — every drawn shape in the app lives here.
 *
 * TODO(asset-swap): to move to Twemoji/Noto SVGs or Lottie stickers, replace
 * entries in GLYPH_ART (or teach GlyphSvg to render an <image>/Lottie player
 * for specific names). LittleIcon, StickerBadge, CategoryIcon and
 * AnimatedSticker are the only consumers — nothing else touches art directly.
 */

/** The original decorative sticker shapes (kept as a named subset — `TEMPLATE_META.sticker` uses it). */
export type StickerName =
  | "flower"
  | "star"
  | "heart"
  | "sparkle"
  | "tape"
  | "film"
  | "book"
  | "leaf";

export type GlyphName =
  | StickerName
  // pictorial category glyphs — fixed pastel fills
  | "headphones"
  | "fork"
  | "ramen-bowl"
  | "gift"
  | "tulip"
  | "pencil"
  | "clapperboard"
  // functional glyphs — currentColor, inherit the surrounding text/pill color
  | "check"
  | "cross"
  | "circle"
  | "star-tiny"
  | "heart-tiny";

/** Glyphs that render in currentColor and belong in pills/rows, not as decoration. */
export const FUNCTIONAL_GLYPHS: ReadonlySet<GlyphName> = new Set([
  "check",
  "cross",
  "circle",
  "star-tiny",
  "heart-tiny",
]);

const STAR_PATH = "M12 2.5l2.5 5.6 6.1.6-4.6 4 1.4 6L12 19.4 6.6 22.7 8 16.7l-4.6-4 6.1-.6z";
const HEART_PATH =
  "M12 21s-7.5-4.7-9.4-9.2C1.2 8.3 3.2 5.3 6.3 5.3c2 0 3.4 1.2 4.2 2.5.8-1.3 2.2-2.5 4.2-2.5 3.1 0 5.1 3 3.7 6.5C19.5 16.3 12 21 12 21z";

/* clapperboard — lid is separate so AnimatedCategoryIcon can clap it */
export const CLAPPER_LID = (
  <g>
    <rect x="3" y="4.4" width="18" height="4.4" rx="1.4" fill="oklch(0.7 0.065 300)" />
    {[5.4, 9.6, 13.8, 18].map((x) => (
      <path key={x} d={`M${x} 4.4l2.2 4.4h1.7l-2.2-4.4z`} fill="oklch(0.96 0.02 300)" opacity="0.85" />
    ))}
  </g>
);
export const CLAPPER_BODY = (
  <g>
    <rect x="3" y="9.4" width="18" height="11" rx="1.8" fill="oklch(0.84 0.058 300)" />
    <rect x="6.2" y="13.2" width="11.6" height="1.7" rx="0.85" fill="oklch(0.96 0.02 300)" opacity="0.9" />
  </g>
);

/* book — halves are separate so the book can open slightly */
export const BOOK_LEFT = (
  <path d="M4 5.2c2.6-1 5.4-1 8 0v14c-2.6-1-5.4-1-8 0z" fill="oklch(0.85 0.045 145)" />
);
export const BOOK_RIGHT = (
  <path d="M20 5.2c-2.6-1-5.4-1-8 0v14c2.6-1 5.4-1 8 0z" fill="oklch(0.8 0.05 145)" />
);
export const BOOK_SPINE = <path d="M12 5.2v14" stroke="oklch(0.65 0.05 145)" strokeWidth="0.8" />;

/* gift — bow is separate so it can pop */
export const GIFT_BOX = (
  <g>
    <rect x="4.5" y="10.2" width="15" height="10.3" rx="1.6" fill="oklch(0.86 0.052 18)" />
    <rect x="3.5" y="6.9" width="17" height="4.2" rx="1.4" fill="oklch(0.9 0.045 18)" />
    <rect x="10.9" y="6.9" width="2.2" height="13.6" fill="oklch(0.97 0.015 18)" />
  </g>
);
export const GIFT_BOW = (
  <path
    d="M12 6.6C10.8 4.1 7.9 3.2 7.3 4.8c-.6 1.5 1.6 2.3 4.7 1.8zM12 6.6c1.2-2.5 4.1-3.4 4.7-1.8.6 1.5-1.6 2.3-4.7 1.8z"
    fill="oklch(0.8 0.07 18)"
  />
);

/* tulip — bloom is separate so it can bloom from the stem */
export const TULIP_STEM = (
  <g>
    <path d="M12 14.5v6" stroke="oklch(0.68 0.06 145)" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M11.6 19.4c-2.8.3-4.7-.8-5.7-2.9 2.7-.6 4.7.3 5.7 2.9z" fill="oklch(0.82 0.05 145)" />
  </g>
);
export const TULIP_BLOOM = (
  <path
    d="M6.5 4.6l2.8 2.7L12 4.2l2.7 3.1 2.8-2.7v4.7c0 3.4-2.2 5.5-5.5 5.5s-5.5-2.1-5.5-5.5z"
    fill="oklch(0.84 0.075 350)"
  />
);

/* ramen — steam is separate so it can rise */
export const RAMEN_STEAM = (
  <path
    d="M9.3 2.8c-.7 1 .7 1.7 0 2.7M14.7 2.8c-.7 1 .7 1.7 0 2.7"
    fill="none"
    stroke="oklch(0.8 0.04 248)"
    strokeWidth="1.3"
    strokeLinecap="round"
  />
);
export const RAMEN_BODY = (
  <g>
    <path d="M3.5 10.5h17a8.5 8.5 0 0 1-17 0z" fill="oklch(0.84 0.05 248)" />
    <path d="M6.2 14h11.6" stroke="oklch(0.96 0.015 248)" strokeWidth="1.4" strokeLinecap="round" />
    <rect x="9" y="18.6" width="6" height="2" rx="1" fill="oklch(0.78 0.05 248)" />
  </g>
);

/* One flat pastel family. Soft outlines, no gradients, gentle shapes. */
export const GLYPH_ART: Record<GlyphName, React.ReactNode> = {
  flower: (
    <>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="12"
          cy="5.4"
          rx="3.1"
          ry="4.4"
          fill="oklch(0.86 0.052 18)"
          transform={`rotate(${a} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="2.7" fill="oklch(0.9 0.075 95)" />
    </>
  ),
  star: (
    <path
      d={STAR_PATH}
      fill="oklch(0.9 0.075 95)"
      stroke="oklch(0.62 0.09 80)"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
  ),
  heart: <path d={HEART_PATH} fill="oklch(0.84 0.07 16)" />,
  sparkle: (
    <path
      d="M12 2c.5 4.6 2.4 6.5 7 7-4.6.5-6.5 2.4-7 7-.5-4.6-2.4-6.5-7-7 4.6-.5 6.5-2.4 7-7z"
      fill="oklch(0.92 0.06 95)"
      stroke="oklch(0.66 0.09 85)"
      strokeWidth="0.7"
      strokeLinejoin="round"
    />
  ),
  tape: (
    <g>
      <rect x="2" y="8" width="20" height="8" rx="1.2" fill="oklch(0.86 0.045 248)" opacity="0.78" />
      <path d="M2 9.2l20 5.6M2 14.8l20-5.6" stroke="oklch(0.78 0.05 248)" strokeWidth="0.7" opacity="0.6" />
    </g>
  ),
  film: (
    <g>
      <rect x="4" y="3.5" width="16" height="17" rx="2.2" fill="oklch(0.84 0.058 300)" />
      <rect x="8" y="6" width="8" height="12" rx="1" fill="oklch(0.96 0.02 300)" />
      {[6, 9.5, 13, 16.5].map((y) => (
        <g key={y}>
          <rect x="5" y={y} width="1.6" height="1.6" rx="0.4" fill="oklch(0.96 0.02 300)" />
          <rect x="17.4" y={y} width="1.6" height="1.6" rx="0.4" fill="oklch(0.96 0.02 300)" />
        </g>
      ))}
    </g>
  ),
  book: (
    <g>
      {BOOK_LEFT}
      {BOOK_RIGHT}
      {BOOK_SPINE}
    </g>
  ),
  leaf: (
    <path
      d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zm2-2c5-2 8-5 9-9-4 1-7 4-9 9z"
      fill="oklch(0.82 0.05 145)"
    />
  ),

  headphones: (
    <g>
      <path
        d="M4.6 15v-2.6a7.4 7.4 0 0 1 14.8 0V15"
        fill="none"
        stroke="oklch(0.68 0.07 300)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <rect x="3" y="13.4" width="4.8" height="7.2" rx="2.2" fill="oklch(0.84 0.058 300)" />
      <rect x="16.2" y="13.4" width="4.8" height="7.2" rx="2.2" fill="oklch(0.84 0.058 300)" />
    </g>
  ),
  fork: (
    <g stroke="oklch(0.62 0.075 45)" strokeWidth="1.9" strokeLinecap="round" fill="none">
      <path d="M8.4 3.5v4" />
      <path d="M12 3.5v4" />
      <path d="M15.6 3.5v4" />
      <path d="M8.4 7.5a3.6 3.6 0 0 0 7.2 0" />
      <path d="M12 11.1v9.4" />
    </g>
  ),
  "ramen-bowl": (
    <g>
      {RAMEN_STEAM}
      {RAMEN_BODY}
    </g>
  ),
  gift: (
    <g>
      {GIFT_BOX}
      {GIFT_BOW}
    </g>
  ),
  tulip: (
    <g>
      {TULIP_STEM}
      {TULIP_BLOOM}
    </g>
  ),
  pencil: (
    <g>
      <path d="M13.6 5.5l4.9 4.9L8.7 20.2l-5.9 1 1-5.9z" fill="oklch(0.9 0.075 95)" />
      <path d="M3.8 15.3l4.9 4.9-5.9 1z" fill="oklch(0.76 0.06 60)" />
      <path
        d="M13.6 5.5l2.4-2.4c.6-.6 1.6-.6 2.2 0l2.7 2.7c.6.6.6 1.6 0 2.2l-2.4 2.4z"
        fill="oklch(0.84 0.07 16)"
      />
    </g>
  ),
  clapperboard: (
    <g>
      {CLAPPER_BODY}
      {CLAPPER_LID}
    </g>
  ),

  check: (
    <path
      d="M4.5 12.6l4.6 4.6L19.5 6.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  cross: (
    <path
      d="M6 6l12 12M18 6L6 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  ),
  circle: <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.8" />,
  "star-tiny": <path d={STAR_PATH} fill="currentColor" />,
  "heart-tiny": <path d={HEART_PATH} fill="currentColor" />,
};

interface GlyphSvgProps {
  name: GlyphName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
}

/** Bare glyph renderer — the shared primitive under LittleIcon/AnimatedSticker/StickerBadge. */
export function GlyphSvg({ name, size = 24, className, style, rotate = 0 }: GlyphSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}
      aria-hidden="true"
      focusable="false"
    >
      {GLYPH_ART[name]}
    </svg>
  );
}

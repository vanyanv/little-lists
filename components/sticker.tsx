import type { CSSProperties } from "react";

export type StickerName =
  | "flower"
  | "star"
  | "heart"
  | "sparkle"
  | "tape"
  | "film"
  | "book"
  | "leaf";

interface StickerProps {
  name: StickerName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
}

/* One flat pastel family. Soft outlines, no gradients, gentle shapes. */
const ART: Record<StickerName, React.ReactNode> = {
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
      d="M12 2.5l2.5 5.6 6.1.6-4.6 4 1.4 6L12 19.4 6.6 22.7 8 16.7l-4.6-4 6.1-.6z"
      fill="oklch(0.9 0.075 95)"
      stroke="oklch(0.62 0.09 80)"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
  ),
  heart: (
    <path
      d="M12 21s-7.5-4.7-9.4-9.2C1.2 8.3 3.2 5.3 6.3 5.3c2 0 3.4 1.2 4.2 2.5.8-1.3 2.2-2.5 4.2-2.5 3.1 0 5.1 3 3.7 6.5C19.5 16.3 12 21 12 21z"
      fill="oklch(0.84 0.07 16)"
    />
  ),
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
      <path d="M4 5.2c2.6-1 5.4-1 8 0v14c-2.6-1-5.4-1-8 0z" fill="oklch(0.85 0.045 145)" />
      <path d="M20 5.2c-2.6-1-5.4-1-8 0v14c2.6-1 5.4-1 8 0z" fill="oklch(0.8 0.05 145)" />
      <path d="M12 5.2v14" stroke="oklch(0.65 0.05 145)" strokeWidth="0.8" />
    </g>
  ),
  leaf: (
    <path
      d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zm2-2c5-2 8-5 9-9-4 1-7 4-9 9z"
      fill="oklch(0.82 0.05 145)"
    />
  ),
};

export function Sticker({ name, size = 24, className, style, rotate = 0 }: StickerProps) {
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
      {ART[name]}
    </svg>
  );
}

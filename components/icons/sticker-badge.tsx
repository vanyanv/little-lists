import type { CSSProperties } from "react";
import { GlyphSvg, type GlyphName } from "./glyphs";

interface StickerBadgeProps {
  /** user-chosen emoji — wins when present; iconography stays drawn, this stays personal */
  emoji?: string | null;
  /** fallback glyph when there's no emoji */
  icon?: GlyphName;
  size?: number;
  /** paper = soft tile on tinted cards; wash = theme tint on paper cards */
  tone?: "paper" | "wash";
  rounded?: string;
  className?: string;
  style?: CSSProperties;
}

/** The one tile frame every emoji "face" (list, person, item, avatar) sits in. */
export function StickerBadge({
  emoji,
  icon = "sparkle",
  size = 46,
  tone = "paper",
  rounded,
  className = "",
  style,
}: StickerBadgeProps) {
  const shape = rounded ?? (size >= 56 ? "rounded-2xl" : size >= 32 ? "rounded-xl" : "rounded-lg");
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center ${shape} ${tone === "paper" ? "bg-paper shadow-soft" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.5),
        ...(tone === "wash" ? { background: "var(--t-bg)" } : null),
        ...style,
      }}
    >
      {emoji || <GlyphSvg name={icon} size={Math.round(size * 0.55)} />}
    </span>
  );
}

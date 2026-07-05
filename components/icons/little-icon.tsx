import type { CSSProperties } from "react";
import { GlyphSvg, type GlyphName } from "./glyphs";
import { AnimatedSticker } from "./animated-sticker";

interface LittleIconProps {
  name: GlyphName;
  size?: number;
  variant?: "plain" | "badge" | "sticker";
  /** rare — reserved for empty states, onboarding, and save moments */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
}

/** The core glyph renderer. `plain` is a bare svg, `badge` a soft tile, `sticker` a die-cut decoration. */
export function LittleIcon({
  name,
  size = 24,
  variant = "plain",
  animated = false,
  className,
  style,
  rotate = 0,
}: LittleIconProps) {
  if (animated) return <AnimatedSticker name={name} size={size} className={className} />;

  if (variant === "badge") {
    return (
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center rounded-xl bg-paper shadow-soft ${className ?? ""}`}
        style={{ width: size, height: size, ...style }}
      >
        <GlyphSvg name={name} size={Math.round(size * 0.6)} rotate={rotate} />
      </span>
    );
  }

  if (variant === "sticker") {
    // die-cut look: a paper-colored halo around the art, with a lazy tilt
    const halo =
      "drop-shadow(1.5px 0 0 var(--color-paper)) drop-shadow(-1.5px 0 0 var(--color-paper)) drop-shadow(0 1.5px 0 var(--color-paper)) drop-shadow(0 -1.5px 0 var(--color-paper))";
    return (
      <GlyphSvg
        name={name}
        size={size}
        rotate={rotate || -6}
        className={className}
        style={{ filter: halo, ...style }}
      />
    );
  }

  return <GlyphSvg name={name} size={size} rotate={rotate} className={className} style={style} />;
}

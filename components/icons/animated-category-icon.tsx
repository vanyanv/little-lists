"use client";

import { motion, useReducedMotion } from "motion/react";
import { GlyphSvg, type GlyphName } from "./glyphs";
import {
  CATEGORY_GLYPH,
  resolveCategorySize,
  type CategoryIconSize,
} from "./category-icon";
import { STICKER_HALO } from "./little-icon";
import { STICKER_POP, WHOLE_MOTION } from "./glyph-motion";

const playOnce = { duration: 0.5, ease: "easeInOut" as const };

interface AnimatedCategoryIconProps {
  id: string;
  size?: CategoryIconSize;
  variant?: "plain" | "badge" | "sticker";
  /** flip true when the user picks this category — the character move plays once */
  play: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * CategoryIcon's interactive sibling for pickers: same glyph resolution, plus
 * a per-glyph character move (clap, pop, bloom…) when `play` lands. Never
 * loops; reduced motion renders fully static.
 */
export function AnimatedCategoryIcon({
  id,
  size = "md",
  variant = "plain",
  play,
  className,
  ariaLabel,
}: AnimatedCategoryIconProps) {
  const reduce = useReducedMotion() ?? false;
  const px = resolveCategorySize(size);
  const name: GlyphName = CATEGORY_GLYPH[id] ?? "sparkle";
  const playing = play && !reduce;
  // badge mirrors LittleIcon: `size` is the tile, the glyph sits at 0.6×
  const glyphPx = variant === "badge" ? Math.round(px * 0.6) : px;

  let core = reduce ? (
    <GlyphSvg name={name} size={glyphPx} />
  ) : (
    <motion.span
      initial={false}
      animate={playing ? (WHOLE_MOTION[name] ?? STICKER_POP) : undefined}
      transition={playOnce}
      className="inline-flex"
      style={{ transformOrigin: "50% 60%" }}
    >
      <GlyphSvg name={name} size={glyphPx} />
    </motion.span>
  );

  if (variant === "badge") {
    core = (
      <span
        className="grid shrink-0 place-items-center rounded-xl bg-paper shadow-soft"
        style={{ width: px, height: px }}
      >
        {core}
      </span>
    );
  } else if (variant === "sticker") {
    core = <span style={{ filter: STICKER_HALO, rotate: "-6deg" }}>{core}</span>;
  }

  return (
    <motion.span
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      className={`inline-flex ${className ?? ""}`}
    >
      {core}
    </motion.span>
  );
}

"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import {
  GlyphSvg,
  type GlyphName,
  CLAPPER_BODY,
  CLAPPER_LID,
  BOOK_LEFT,
  BOOK_RIGHT,
  BOOK_SPINE,
  GIFT_BOX,
  GIFT_BOW,
  TULIP_STEM,
  TULIP_BLOOM,
  RAMEN_BODY,
  RAMEN_STEAM,
} from "./glyphs";
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
 * a per-glyph character move (lid claps, bow pops, bloom blooms…) when `play`
 * lands. Never loops; reduced motion renders fully static.
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
    <AnimatedGlyph name={name} size={glyphPx} play={playing} />
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

/** the svg frame every animated glyph shares */
function Frame({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** a sub-part that moves — origin is in the part's own bounding box */
function Part({
  play,
  move,
  origin,
  children,
}: {
  play: boolean;
  move: TargetAndTransition;
  origin: string;
  children: ReactNode;
}) {
  return (
    <motion.g
      initial={false}
      animate={play ? move : undefined}
      transition={playOnce}
      style={{ transformBox: "fill-box", transformOrigin: origin }}
    >
      {children}
    </motion.g>
  );
}

function AnimatedGlyph({ name, size, play }: { name: GlyphName; size: number; play: boolean }) {
  switch (name) {
    case "clapperboard":
      return (
        <Frame size={size}>
          {CLAPPER_BODY}
          <Part play={play} move={{ rotate: [0, -16, 0, -9, 0] }} origin="0% 100%">
            {CLAPPER_LID}
          </Part>
        </Frame>
      );
    case "book":
      return (
        <Frame size={size}>
          <Part play={play} move={{ rotate: [0, -6, 0], scaleX: [1, 0.94, 1] }} origin="100% 50%">
            {BOOK_LEFT}
          </Part>
          <Part play={play} move={{ rotate: [0, 6, 0], scaleX: [1, 0.94, 1] }} origin="0% 50%">
            {BOOK_RIGHT}
          </Part>
          {BOOK_SPINE}
        </Frame>
      );
    case "gift":
      return (
        <Frame size={size}>
          {GIFT_BOX}
          <Part play={play} move={{ scale: [1, 1.3, 0.95, 1.12, 1] }} origin="50% 100%">
            {GIFT_BOW}
          </Part>
        </Frame>
      );
    case "tulip":
      return (
        <Frame size={size}>
          {TULIP_STEM}
          <Part play={play} move={{ scale: [1, 1.14, 0.98, 1.06, 1] }} origin="50% 100%">
            {TULIP_BLOOM}
          </Part>
        </Frame>
      );
    case "ramen-bowl":
      return (
        <Frame size={size}>
          <Part play={play} move={{ y: [0, -1.8, 0], opacity: [1, 0.35, 1] }} origin="50% 100%">
            {RAMEN_STEAM}
          </Part>
          {RAMEN_BODY}
        </Frame>
      );
    default: {
      const move = WHOLE_MOTION[name] ?? STICKER_POP;
      return (
        <motion.span
          initial={false}
          animate={play ? move : undefined}
          transition={playOnce}
          className="inline-flex"
          style={{ transformOrigin: "50% 60%" }}
        >
          <GlyphSvg name={name} size={size} />
        </motion.span>
      );
    }
  }
}

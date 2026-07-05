"use client";

import { motion, useReducedMotion } from "motion/react";
import { GlyphSvg, type GlyphName } from "./glyphs";

const BITS: { name: GlyphName; x: number; y: number; d: number; rotate?: number }[] = [
  { name: "sparkle", x: -26, y: -22, d: 0 },
  { name: "star", x: 28, y: -18, d: 0.05 },
  { name: "sparkle", x: -18, y: 20, d: 0.1, rotate: 24 },
  { name: "star", x: 22, y: 24, d: 0.08, rotate: -18 },
  { name: "sparkle", x: 0, y: -32, d: 0.03 },
];

/** A tiny drawn sparkle pop — shown briefly near a just-saved item. */
export function SaveSparkle() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      {BITS.map((b, i) => (
        <motion.span
          key={i}
          className="absolute"
          initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.85], x: b.x, y: b.y }}
          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: b.d }}
        >
          <GlyphSvg name={b.name} size={18} rotate={b.rotate} />
        </motion.span>
      ))}
    </div>
  );
}

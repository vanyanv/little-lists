"use client";

import { motion, useReducedMotion } from "motion/react";

const BITS = [
  { emoji: "✨", x: -26, y: -22, d: 0 },
  { emoji: "🌟", x: 28, y: -18, d: 0.05 },
  { emoji: "✨", x: -18, y: 20, d: 0.1 },
  { emoji: "💫", x: 22, y: 24, d: 0.08 },
  { emoji: "✨", x: 0, y: -32, d: 0.03 },
];

/** A tiny, local emoji sparkle pop — shown briefly near a just-saved item. */
export function SparkleBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      {BITS.map((b, i) => (
        <motion.span
          key={i}
          className="absolute text-lg"
          initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.05, 0.7], x: b.x, y: b.y }}
          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: b.d }}
        >
          {b.emoji}
        </motion.span>
      ))}
    </div>
  );
}

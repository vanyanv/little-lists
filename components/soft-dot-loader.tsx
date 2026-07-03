"use client";

import { motion, useReducedMotion } from "motion/react";

// the theme base hues, straight from the design tokens
const DOTS = [
  "var(--color-blush)",
  "var(--color-butter)",
  "var(--color-sage)",
  "var(--color-lavender)",
];

interface SoftDotLoaderProps {
  label?: string;
  className?: string;
}

/** A cute, soft search loader — warm dots breathing, never techy. */
export function SoftDotLoader({ label = "finding little things", className = "" }: SoftDotLoaderProps) {
  const reduce = useReducedMotion();

  return (
    <div className={`flex flex-col items-center gap-3 py-8 ${className}`}>
      <div className="flex items-end gap-2">
        {DOTS.map((c, i) => (
          <motion.span
            key={c}
            className="block rounded-full"
            style={{ width: 11, height: 11, background: c }}
            animate={reduce ? {} : { y: [0, -7, 0], opacity: [0.55, 1, 0.55] }}
            transition={
              reduce
                ? {}
                : { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }
            }
          />
        ))}
      </div>
      <p className="text-[0.85rem] font-medium text-brown">{label}</p>
    </div>
  );
}

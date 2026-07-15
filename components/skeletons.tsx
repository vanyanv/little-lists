"use client";

import { motion, useReducedMotion } from "motion/react";

const ASPECT: Record<"poster" | "square", string> = {
  poster: "aspect-[2/3]",
  square: "aspect-square",
};

const breathe = { opacity: [0.45, 0.9, 0.45] };
const breatheLoop = { duration: 1.4, repeat: Infinity, ease: "easeInOut" as const };

/** A pulsing cover-shaped block — the spot real art will land in. */
export function CoverSkeleton({
  aspect = "poster",
  rounded = "rounded-md",
  className = "",
  delay = 0,
}: {
  aspect?: "poster" | "square";
  rounded?: string;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className={`block w-full bg-cream-deep ${ASPECT[aspect]} ${rounded} ${className}`}
      animate={reduce ? { opacity: 0.6 } : breathe}
      transition={reduce ? undefined : { ...breatheLoop, delay }}
    />
  );
}

/**
 * Search results while they load: rows shaped exactly like the hits that will
 * replace them (cover + two text lines), breathing softly.
 */
export function ResultListSkeleton({
  rows = 4,
  aspect = "poster",
  label = "finding little things",
}: {
  rows?: number;
  aspect?: "poster" | "square";
  label?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="flex items-center gap-3 rounded-xl bg-cream-deep/40 p-2"
          animate={reduce ? { opacity: 0.7 } : breathe}
          transition={reduce ? undefined : { ...breatheLoop, delay: i * 0.14 }}
        >
          <span className={`w-11 shrink-0 bg-cream-deep ${ASPECT[aspect]} rounded-md`} />
          <span className="min-w-0 flex-1">
            <span className="block h-3.5 w-3/5 rounded-pill bg-cream-deep" />
            <span className="mt-2 block h-3 w-2/5 rounded-pill bg-cream-deep/80" />
          </span>
        </motion.div>
      ))}
    </div>
  );
}

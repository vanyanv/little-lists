import type { Transition, Variants } from "motion/react";

// Soft spring — the house motion. Fast but gentle, never bouncy.
export const softSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
};

export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 26,
};

// a touch springier, for the bottom sheet
export const sheetSpring: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
};

export const tap = { scale: 0.97 };
export const hover = { scale: 1.02 };

// staggered entrance for grids / card collections
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: softSpring },
};

export const popItem: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: softSpring },
};

export const fadeSlide: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
};

// shared viewport config for scroll reveals — fire once, a bit before fully visible
export const inViewOnce = { once: true, amount: 0.3 } as const;

// posters fanning out of a loose stack — each rises and settles into its own
// resting tilt, passed per-poster via `custom`
export const posterFan: Variants = {
  hidden: { opacity: 0, y: 16, rotate: 0, scale: 0.94 },
  show: (tilt: number = 0) => ({
    opacity: 1,
    y: 0,
    rotate: tilt,
    scale: 1,
    transition: gentleSpring,
  }),
};

// a book slid onto a shelf: enters from the side, straightens as it lands
export const shelfSlide: Variants = {
  hidden: { opacity: 0, x: 22, rotate: 2 },
  show: { opacity: 1, x: 0, rotate: 0, transition: gentleSpring },
};

// a barely-there vertical drift for decorative hero stickers. Slow and small on
// purpose; anything livelier fights the calm-by-default rule. Callers must
// guard with useReducedMotion — JS loops aren't covered by the global CSS rule.
export const gentleFloat = (delay = 0) => ({
  y: [0, -5, 0],
  transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const, delay },
});

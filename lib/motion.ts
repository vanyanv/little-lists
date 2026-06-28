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

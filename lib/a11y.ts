// lib/a11y.ts — shared keyboard-focus affordances (WCAG 2.4.7), warm-tinted to match the system.
/** focus ring for light surfaces: chips, cards, inputs, menu items, links */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
/** focus ring for dark (ink) surfaces: the FAB and primary ink buttons */
export const focusRingOnDark =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink";
/** inset ring for elements inside overflow-hidden cards / the nav pill */
export const focusRingInset =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40";

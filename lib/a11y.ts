// lib/a11y.ts — shared keyboard-focus affordances (WCAG 2.4.7), warm-tinted to match the system.
// Server-safe: class-name constants only. The combobox keyboard-nav hook lives in
// lib/use-combobox-nav.ts ("use client") so this module can be imported from Server
// Components (marketing pages) without tripping the RSC client-only boundary.

/** focus ring for light surfaces: chips, cards, inputs, menu items, links */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
/** focus ring for dark (ink) surfaces: the FAB and primary ink buttons */
export const focusRingOnDark =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink";
/** inset ring for elements inside overflow-hidden cards / the nav pill */
export const focusRingInset =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40";
/**
 * focus ring for a stretched-link card: the Link itself only wraps the title, and an
 * `::after` pseudo-element (positioned by the card root, not the Link) stretches over
 * the whole tappable surface. The ring has to be drawn on that `::after` box — not the
 * Link's own small box — so keyboard focus still outlines the entire card.
 */
export const focusRingStretched =
  "outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ink/40 focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-paper";

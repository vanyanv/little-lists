import type { GlyphName } from "./glyphs";

/**
 * Motion data for glyph character moves — kept as plain data (no motion/react)
 * so the node-env test suite can guard it like GLYPH_ART.
 *
 * TODO(asset-swap): animated vendor stickers (Lottie / Animated Noto) would
 * replace both registries here — AnimatedCategoryIcon is the only consumer.
 */

/** Whole-icon keyframe moves, played once (~0.5s) when a pick lands. */
export const WHOLE_MOTION: Partial<
  Record<GlyphName, { rotate?: number[]; scale?: number[]; y?: number[] }>
> = {
  fork: { rotate: [0, -9, 7, -4, 0] }, // tiny wiggle
  flower: { scale: [1, 1.16, 0.97, 1] }, // soft pulse
  heart: { scale: [1, 1.16, 0.97, 1] }, // soft pulse
  sparkle: { rotate: [0, 18, -10, 0], scale: [1, 1.14, 0.96, 1] }, // twinkle
  pencil: { rotate: [0, -10, 6, 0] }, // little tilt
  headphones: { y: [0, -1.6, 0, -1, 0] }, // bounce to the beat
};

/** Glyphs whose move animates a sub-part — AnimatedCategoryIcon renders these itself. */
export const PART_MOTION_GLYPHS: readonly GlyphName[] = [
  "clapperboard", // lid claps
  "book", // halves open slightly
  "gift", // bow pops
  "tulip", // bloom blooms
  "ramen-bowl", // steam rises
];

/** Fallback for glyphs with no bespoke move — a gentle sticker pop. */
export const STICKER_POP = { scale: [1, 1.12, 0.97, 1] };

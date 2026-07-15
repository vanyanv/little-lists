import type { GlyphName } from "./glyphs";

/**
 * Motion data for glyph character moves — kept as plain data (no motion/react)
 * so the node-env test suite can guard it like GLYPH_ART. Emoji are single
 * pieces of art, so every move animates the whole glyph.
 */

/** Whole-icon keyframe moves, played once (~0.5s) when a pick lands. */
export const WHOLE_MOTION: Partial<
  Record<GlyphName, { rotate?: number[]; scale?: number[]; y?: number[] }>
> = {
  clapperboard: { rotate: [0, -14, 0, -8, 0] }, // a little clap
  book: { rotate: [0, -7, 5, 0], scale: [1, 1.08, 1] }, // pages riffle
  gift: { scale: [1, 1.24, 0.95, 1.1, 1] }, // bow pops
  tulip: { scale: [1, 1.14, 0.98, 1.06, 1], y: [0, -1.4, 0] }, // bloom blooms
  "ramen-bowl": { y: [0, -2, 0, -1.2, 0] }, // steam rises
  fork: { rotate: [0, -9, 7, -4, 0] }, // tiny wiggle
  flower: { scale: [1, 1.16, 0.97, 1] }, // soft pulse
  heart: { scale: [1, 1.16, 0.97, 1] }, // soft pulse
  sparkle: { rotate: [0, 18, -10, 0], scale: [1, 1.14, 0.96, 1] }, // twinkle
  pencil: { rotate: [0, -10, 6, 0] }, // little tilt
  headphones: { y: [0, -1.6, 0, -1, 0] }, // bounce to the beat
};

/** Fallback for glyphs with no bespoke move — a gentle sticker pop. */
export const STICKER_POP = { scale: [1, 1.12, 0.97, 1] };

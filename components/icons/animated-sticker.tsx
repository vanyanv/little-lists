"use client";

import { motion, useReducedMotion } from "motion/react";
import { GlyphSvg, type GlyphName } from "./glyphs";

// twinkle offsets are tuned for the 112px frame and scale with it
const TWINKLES = [
  { x: -38, y: -6, d: 0 },
  { x: 40, y: 8, d: 0.8 },
  { x: 18, y: -40, d: 1.6 },
];

interface AnimatedStickerProps {
  name: GlyphName;
  size?: number;
  halo?: boolean;
  twinkles?: boolean;
  className?: string;
}

/**
 * A softly floating sticker with a blurred halo and slow twinkles — the app's
 * "big cozy moment" treatment for empty states and onboarding. Animation is
 * rare on purpose; don't reach for this in list rows or pickers.
 *
 * TODO(asset-swap): a Lottie / Animated Noto sticker would replace the float +
 * twinkle body below — keep the halo frame and the reduced-motion guard.
 */
export function AnimatedSticker({
  name,
  size = 64,
  halo = true,
  twinkles = true,
  className = "",
}: AnimatedStickerProps) {
  const reduce = useReducedMotion();
  const frame = Math.round(size * 1.75);
  const scale = frame / 112;

  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ width: frame, height: frame }}
    >
      {halo && (
        <span
          className="absolute inset-0 rounded-full blur-md opacity-70"
          style={{ background: "var(--t-bg, var(--color-cream-deep))" }}
        />
      )}
      <motion.div
        animate={reduce ? {} : { y: [0, -8, 0], rotate: [-3, 3, -3] }}
        transition={reduce ? {} : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <GlyphSvg name={name} size={size} />
      </motion.div>
      {twinkles &&
        !reduce &&
        TWINKLES.map((s, i) => (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: "50%", top: "50%", x: s.x * scale, y: s.y * scale }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: s.d }}
          >
            <GlyphSvg name="sparkle" size={16} />
          </motion.span>
        ))}
    </div>
  );
}

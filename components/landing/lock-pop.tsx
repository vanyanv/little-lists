"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { StickerBadge } from "@/components/icons/sticker-badge";
import { STICKER_POP } from "@/components/icons/glyph-motion";

/** The privacy card's lock, giving one soft sticker pop as it scrolls into view. */
export function LockPop() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  return (
    <motion.span
      ref={ref}
      className="inline-flex"
      initial={false}
      animate={inView && !reduce ? STICKER_POP : undefined}
      transition={{ duration: 0.5, ease: "easeInOut", delay: 0.2 }}
    >
      <StickerBadge icon="lock" size={64} />
    </motion.span>
  );
}

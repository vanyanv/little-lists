"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { AnimatedSticker } from "./icons/animated-sticker";
import type { StickerName } from "./icons/glyphs";
import { softSpring } from "@/lib/motion";

interface EmptyStateProps {
  sticker?: StickerName;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ sticker = "sparkle", title, hint, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      className="flex flex-col items-center px-8 py-16 text-center"
    >
      <AnimatedSticker name={sticker} size={64} className="mb-6" />

      <h3 className="font-display text-[1.45rem] font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-brown">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

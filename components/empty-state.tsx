"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Sticker, type StickerName } from "./sticker";
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
      <div className="relative mb-6 grid h-28 w-28 place-items-center">
        {/* soft halo */}
        <span
          className="absolute inset-0 rounded-full blur-md opacity-70"
          style={{ background: "var(--t-bg, oklch(0.955 0.018 73))" }}
        />
        {/* the floating sticker */}
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sticker name={sticker} size={64} />
        </motion.div>
        {/* twinkles */}
        {[
          { x: -38, y: -6, d: 0 },
          { x: 40, y: 8, d: 0.8 },
          { x: 18, y: -40, d: 1.6 },
        ].map((s, i) => (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: "50%", top: "50%", x: s.x, y: s.y }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: s.d }}
          >
            <Sticker name="sparkle" size={16} />
          </motion.span>
        ))}
      </div>

      <h3 className="font-display text-[1.45rem] font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-brown">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

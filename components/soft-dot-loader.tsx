"use client";

import { motion, useReducedMotion } from "motion/react";

const DOTS = [
  "oklch(0.86 0.052 18)",
  "oklch(0.9 0.075 95)",
  "oklch(0.85 0.045 145)",
  "oklch(0.84 0.058 300)",
];

interface SoftDotLoaderProps {
  label?: string;
  className?: string;
}

/** A cute, soft search loader — warm dots breathing, never techy. */
export function SoftDotLoader({ label = "finding little things", className = "" }: SoftDotLoaderProps) {
  const reduce = useReducedMotion();

  return (
    <div className={`flex flex-col items-center gap-3 py-8 ${className}`}>
      <div className="flex items-end gap-2">
        {DOTS.map((c, i) => (
          <motion.span
            key={c}
            className="block rounded-full"
            style={{ width: 11, height: 11, background: c }}
            animate={reduce ? {} : { y: [0, -7, 0], opacity: [0.55, 1, 0.55] }}
            transition={
              reduce
                ? {}
                : { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }
            }
          />
        ))}
      </div>
      <p className="text-[0.85rem] font-medium text-brown">{label}</p>
    </div>
  );
}

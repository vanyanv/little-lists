"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";

type ChipVariant = "filter" | "tag" | "soft";

interface ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

export function Chip({
  children,
  variant = "tag",
  active = false,
  onClick,
  className = "",
}: ChipProps) {
  const base =
    "inline-flex items-center gap-1.5 rounded-pill whitespace-nowrap font-semibold leading-none select-none transition-colors";
  // filter chips are tap targets, so give them a thumb-friendly ~44px height
  const size =
    variant === "filter"
      ? "min-h-11 px-4 text-[0.84rem]"
      : "px-3.5 py-2 text-[0.82rem]";

  let look = "";
  if (variant === "filter") {
    look = active
      ? "bg-ink text-cream shadow-soft"
      : `bg-paper text-brown ring-1 ring-line/70${onClick ? " hover:bg-cream-deep" : ""}`;
  } else if (variant === "tag") {
    look = `bg-paper text-ink-soft ring-1 ring-line${onClick ? " hover:bg-cream-deep" : ""}`;
  } else {
    // soft — uses the surrounding theme vars
    look = "text-[var(--t-ink)]";
  }
  const softStyle =
    variant === "soft" ? { background: "var(--t-bg)" } : undefined;

  if (!onClick) {
    return (
      <span className={`${base} ${size} ${look} ${className}`} style={softStyle}>
        {children}
      </span>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={tap}
      className={`${base} ${size} ${look} ${focusRing} ${className}`}
      style={softStyle}
    >
      {children}
    </motion.button>
  );
}

/**
 * A quiet marker for onboarding-seeded rows, so example content reads as a
 * gentle suggestion rather than something you added yourself.
 */
export function ExampleChip({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-pill bg-cream-deep px-2 py-0.5 text-[0.68rem] font-semibold leading-none text-brown-soft ${className}`}
    >
      example
    </span>
  );
}

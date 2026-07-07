"use client";

import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { STATUS_META, type StatusId, type StatusTone } from "@/lib/types";
import { tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { LittleIcon } from "./icons/little-icon";
import type { GlyphName } from "./icons/glyphs";

const TONE: Record<StatusTone, { bg: string; fg: string; glyph: GlyphName }> = {
  good: { bg: "var(--color-status-good-bg)", fg: "var(--color-status-good-ink)", glyph: "check" },
  bad: { bg: "var(--color-status-bad-bg)", fg: "var(--color-status-bad-ink)", glyph: "cross" },
  love: { bg: "var(--color-status-love-bg)", fg: "var(--color-status-love-ink)", glyph: "heart-tiny" },
  neutral: { bg: "var(--color-status-neutral-bg)", fg: "var(--color-status-neutral-ink)", glyph: "circle" },
};

interface StatusPillProps {
  status: StatusId;
  size?: "sm" | "md";
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function StatusPill({ status, size = "sm", onClick, className = "", style }: StatusPillProps) {
  const meta = STATUS_META[status];
  const tone = TONE[meta.tone];
  const pad = size === "md" ? "px-3 py-1.5 text-[0.8rem]" : "px-2.5 py-1 text-[0.75rem]";
  const inner = (
    <>
      <span aria-hidden className="opacity-80">
        <LittleIcon name={tone.glyph} size={size === "md" ? 10 : 9} />
      </span>
      {meta.label}
    </>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={tap}
        className={`inline-flex items-center gap-1.5 rounded-pill font-semibold leading-none whitespace-nowrap ${pad} hover:opacity-90 transition-opacity ${focusRing} ${className}`}
        style={{ background: tone.bg, color: tone.fg, ...style }}
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill font-semibold leading-none whitespace-nowrap ${pad} ${className}`}
      style={{ background: tone.bg, color: tone.fg, ...style }}
    >
      {inner}
    </span>
  );
}

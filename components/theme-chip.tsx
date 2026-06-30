"use client";

import { motion } from "motion/react";
import type { ThemeColor } from "@/lib/types";
import { THEME_COLORS } from "@/lib/types";
import { softSpring, tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";

const SWATCH: Record<ThemeColor, string> = {
  blush: "oklch(0.86 0.052 18)",
  butter: "oklch(0.9 0.075 95)",
  sage: "oklch(0.85 0.045 145)",
  sky: "oklch(0.86 0.045 248)",
  lavender: "oklch(0.84 0.058 300)",
  clay: "oklch(0.85 0.045 55)",
};

const LABEL: Record<ThemeColor, string> = {
  blush: "Blush",
  butter: "Butter",
  sage: "Sage",
  sky: "Sky",
  lavender: "Lavender",
  clay: "Clay",
};

export function swatchOf(theme: ThemeColor): string {
  return SWATCH[theme];
}

interface ThemeChipProps {
  theme: ThemeColor;
  selected?: boolean;
  onSelect?: (t: ThemeColor) => void;
  size?: number;
}

/** A single tappable color swatch. */
export function ThemeChip({ theme, selected, onSelect, size = 34 }: ThemeChipProps) {
  return (
    <motion.button
      type="button"
      whileTap={tap}
      onClick={() => onSelect?.(theme)}
      aria-label={LABEL[theme]}
      aria-pressed={selected}
      className={`relative grid place-items-center rounded-full ${focusRing}`}
      style={{ width: size + 10, height: size + 10 }}
    >
      {selected && (
        <motion.span
          layoutId="theme-ring"
          transition={softSpring}
          className="absolute inset-0 rounded-full ring-2 ring-ink/70"
        />
      )}
      <span
        className="rounded-full shadow-soft ring-1 ring-line"
        style={{ width: size, height: size, background: SWATCH[theme] }}
      />
    </motion.button>
  );
}

/** A row of all theme swatches — the warm color picker. */
export function ThemeColorPicker({
  value,
  onChange,
}: {
  value: ThemeColor;
  onChange: (t: ThemeColor) => void;
}) {
  return (
    <div role="group" aria-label="Theme color" className="flex flex-wrap items-center gap-1.5">
      {THEME_COLORS.map((t) => (
        <ThemeChip key={t} theme={t} selected={t === value} onSelect={onChange} />
      ))}
    </div>
  );
}

"use client";

import { motion } from "motion/react";
import type { ThemeColor } from "@/lib/types";
import { THEME_COLORS } from "@/lib/types";
import { softSpring, tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";

// the theme base hues, straight from the design tokens
const SWATCH: Record<ThemeColor, string> = {
  blush: "var(--color-blush)",
  butter: "var(--color-butter)",
  sage: "var(--color-sage)",
  sky: "var(--color-sky)",
  lavender: "var(--color-lavender)",
  clay: "var(--color-clay)",
};

const LABEL: Record<ThemeColor, string> = {
  blush: "Blush",
  butter: "Butter",
  sage: "Sage",
  sky: "Sky",
  lavender: "Lavender",
  clay: "Clay",
};

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

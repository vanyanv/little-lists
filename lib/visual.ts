import type { CSSProperties } from "react";
import type { List, ThemeColor } from "./types";

/** tiny stable string hash → positive int */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** designed placeholder "cover art": a soft muted duotone, stable per seed */
export function posterGradient(seed: string): CSSProperties {
  const h = hashString(seed);
  const hue1 = h % 360;
  const hue2 = (hue1 + 38) % 360;
  return {
    background: `linear-gradient(152deg, oklch(0.85 0.085 ${hue1}), oklch(0.73 0.11 ${hue2}))`,
  };
}

/** the ghost initial tint that floats on a poster */
export function posterInk(seed: string): string {
  const hue1 = hashString(seed) % 360;
  return `oklch(0.97 0.03 ${hue1})`;
}

export function themeClass(theme: ThemeColor): string {
  return `theme-${theme}`;
}

export function initialOf(title: string): string {
  const c = title.trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}

/** live, truthful subtitle: "6 little films saved" / cozy empty copy */
export function listCountLabel(list: List): string {
  const n = list.items.length;
  if (n === 0) return "waiting for its first little thing";
  return `${n} ${list.noun}`;
}

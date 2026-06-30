"use client";

import { motion, useReducedMotion } from "motion/react";
import { tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import type { ViewMode } from "@/lib/types";

export type { ViewMode } from "@/lib/types";

/** The little glyph for each browsing view — reused on list cards and the toggle. */
export function ViewIcon({ mode, size = 16 }: { mode: ViewMode; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.1,
  } as const;
  if (mode === "grid") {
    return (
      <svg {...common} strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
      </svg>
    );
  }
  if (mode === "list") {
    return (
      <svg {...common} strokeLinecap="round">
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 6.6l1.7 1.7L8.4 5" />
      <path d="M3.5 17.6l1.7 1.7 3.2-3.3" />
      <line x1="12" y1="6.6" x2="20.5" y2="6.6" />
      <line x1="12" y1="17.6" x2="20.5" y2="17.6" />
    </svg>
  );
}

const MODES: { id: ViewMode; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
  { id: "cozy", label: "Cozy" },
];

/** A subtle segmented control to switch how a list is browsed: covers, rows, or cozy notes. */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const reduce = useReducedMotion();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-pill bg-paper p-0.5 shadow-soft ring-1 ring-line/60">
      {MODES.map((m) => {
        const active = m.id === value;
        return (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            whileTap={tap}
            aria-pressed={active}
            aria-label={`${m.label} view`}
            title={`${m.label} view`}
            className={`relative grid h-8 w-8 place-items-center rounded-full ${focusRing}`}
            style={{ color: active ? "var(--color-cream)" : "var(--color-brown)" }}
          >
            {active && (
              <motion.span
                layoutId="view-pill"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-full bg-ink shadow-soft"
              />
            )}
            <span className="relative">
              <ViewIcon mode={m.id} />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

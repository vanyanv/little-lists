"use client";

import { motion, useReducedMotion } from "motion/react";
import { LayoutGrid, List, ListChecks } from "lucide-react";
import { tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import type { ViewMode } from "@/lib/types";

export type { ViewMode } from "@/lib/types";

/** The little glyph for each browsing view — reused on list cards and the toggle. */
export function ViewIcon({ mode, size = 16 }: { mode: ViewMode; size?: number }) {
  if (mode === "grid") return <LayoutGrid size={size} strokeWidth={2.1} />;
  if (mode === "list") return <List size={size} strokeWidth={2.1} />;
  return <ListChecks size={size} strokeWidth={2.1} />;
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
    <div className="inline-flex items-center gap-2 rounded-pill bg-paper p-0.5 shadow-soft ring-1 ring-line/60">
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
            className={`relative grid h-10 w-10 place-items-center rounded-full before:absolute before:-inset-1 before:content-[''] ${focusRing}`}
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

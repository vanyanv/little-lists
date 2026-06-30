"use client";

import { motion, useReducedMotion } from "motion/react";
import { tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";

export interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  active: string;
  onChange: (id: string) => void;
}

/** A swipeable rail of status filters with live counts and a sliding highlight. */
export function FilterChips({ options, active, onChange }: FilterChipsProps) {
  const reduce = useReducedMotion();

  return (
    <div className="no-scrollbar fade-x -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((opt) => {
        const isActive = opt.id === active;
        const dim = opt.count === 0 && !isActive;
        return (
          <motion.button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            whileTap={tap}
            aria-pressed={isActive}
            className={`relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-4 text-[0.82rem] font-bold leading-none ${focusRing}`}
            style={{
              color: isActive ? "var(--color-cream)" : "var(--color-brown)",
            }}
          >
            {isActive && (
              <motion.span
                layoutId="filter-pill"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-pill bg-ink shadow-soft"
              />
            )}
            {!isActive && (
              <span className="absolute inset-0 rounded-pill bg-paper ring-1 ring-line/70" />
            )}
            <span className={`relative ${dim ? "opacity-45" : ""}`}>{opt.label}</span>
            <span
              className={`relative grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.66rem] ${
                dim ? "opacity-45" : ""
              }`}
              style={{
                background: isActive ? "var(--color-cream)" : "var(--t-bg, var(--color-cream-deep))",
                color: isActive ? "var(--color-ink)" : "var(--t-ink, var(--color-brown))",
              }}
            >
              {opt.count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

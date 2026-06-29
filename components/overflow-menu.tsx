"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { tap } from "@/lib/motion";

interface OverflowMenuItem {
  label: string;
  tone?: "default" | "danger";
  onSelect: () => void;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  ariaLabel?: string;
  stopPropagation?: boolean;
}

/** A ⋯ trigger that opens a cozy anchored popover of actions. */
export function OverflowMenu({ items, ariaLabel = "More options", stopPropagation }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const guard = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        whileTap={tap}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          guard(e);
          setOpen((o) => !o);
        }}
        className="grid h-9 w-9 place-items-center rounded-full bg-paper/80 text-ink shadow-soft backdrop-blur-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* tap-away scrim (transparent) */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={(e) => {
                guard(e);
                setOpen(false);
              }}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-11 z-50 min-w-[10rem] overflow-hidden rounded-xl bg-paper p-1 shadow-lift ring-1 ring-line/60"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    guard(e);
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={`block w-full rounded-lg px-3.5 py-2.5 text-left text-[0.92rem] font-semibold transition-colors hover:bg-cream-deep ${
                    item.tone === "danger" ? "text-rosewood" : "text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

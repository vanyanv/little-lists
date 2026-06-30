"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { tap } from "@/lib/motion";
import { focusRing, focusRingInset } from "@/lib/a11y";

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
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Move focus to the first menu item when the menu opens
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const first = menuRef.current?.querySelector<HTMLButtonElement>('button[role="menuitem"]');
      first?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const guard = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const portal = (
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
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={
              rect
                ? {
                    position: "fixed",
                    top: rect.bottom + 6,
                    right: Math.max(8, window.innerWidth - rect.right),
                  }
                : { position: "fixed", top: 0, right: 8 }
            }
            className="z-50 min-w-[10rem] overflow-hidden rounded-xl bg-paper p-1 shadow-lift ring-1 ring-line/60"
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
                className={`block w-full rounded-lg px-3.5 py-2.5 text-left text-[0.92rem] font-semibold transition-colors hover:bg-cream-deep ${focusRingInset} ${
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
  );

  return (
    <div className="relative">
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={tap}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          guard(e);
          if (!open && triggerRef.current) {
            setRect(triggerRef.current.getBoundingClientRect());
          }
          setOpen((o) => !o);
        }}
        className={`grid h-9 w-9 place-items-center rounded-full bg-paper/80 text-ink shadow-soft backdrop-blur-sm ${focusRing}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </motion.button>

      {mounted && createPortal(portal, document.body)}
    </div>
  );
}

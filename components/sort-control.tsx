"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { tap } from "@/lib/motion";
import { focusRing, focusRingInset } from "@/lib/a11y";
import { SORT_MODES, type SortMode } from "@/lib/sort";

/** A labeled trigger that opens an anchored popover of the five sort modes. */
export function SortControl({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (v: SortMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // return focus to the trigger on close (Escape / select / tap-away)
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const portal = (
    <AnimatePresence>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label="Sort by"
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={
              rect
                ? { position: "fixed", top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) }
                : { position: "fixed", top: 0, right: 8 }
            }
            className="z-50 min-w-[11rem] overflow-hidden rounded-xl bg-paper p-1 shadow-lift ring-1 ring-line/60"
          >
            {SORT_MODES.map((m) => {
              const active = m.id === value;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setOpen(false);
                    onChange(m.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3.5 py-2.5 text-left text-[0.92rem] font-semibold transition-colors hover:bg-cream-deep ${focusRingInset} ${
                    active ? "text-ink" : "text-brown"
                  }`}
                >
                  <span aria-hidden className={`w-3 ${active ? "opacity-100" : "opacity-0"}`}>✓</span>
                  {m.label}
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const currentLabel = SORT_MODES.find((m) => m.id === value)?.label ?? "Sort";

  return (
    <div className="relative">
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={tap}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort by ${currentLabel}`}
        title={`Sort: ${currentLabel}`}
        onClick={() => {
          if (!open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
          setOpen((o) => !o);
        }}
        className={`inline-flex h-10 items-center gap-1.5 rounded-pill bg-paper px-3 text-[0.82rem] font-bold text-brown shadow-soft ring-1 ring-line/60 ${focusRing}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden>
          <path d="M7 5v14M7 19l-3-3M7 5l3 3" />
          <line x1="13" y1="7" x2="20" y2="7" />
          <line x1="13" y1="12" x2="18" y2="12" />
          <line x1="13" y1="17" x2="16" y2="17" />
        </svg>
        <span className="max-w-[6.5rem] truncate">{currentLabel}</span>
      </motion.button>
      {mounted && createPortal(portal, document.body)}
    </div>
  );
}

"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { sheetSpring } from "@/lib/motion";

const FOCUSABLE_SELECTOR =
  'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    // motion.button (whileTap/whileHover) stamps tabindex="0" even on disabled buttons,
    // so disabled state has to be checked directly rather than trusted to the selector.
    if ((el as HTMLButtonElement | HTMLInputElement).disabled) return false;
    if (el.getAttribute("aria-disabled") === "true") return false;
    return el.offsetParent !== null || el === document.activeElement;
  });
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** small eyebrow above the title area, optional */
  ariaLabel?: string;
}

/** A native-feeling mobile sheet: scrim fade + spring slide, drag to dismiss. */
export function BottomSheet({ open, onClose, children, ariaLabel }: BottomSheetProps) {
  const reduce = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Track the last element focused outside any dialog, continuously (not just while
  // open). A child's autoFocus fires during the same commit that mounts the sheet,
  // before this component's own effects run, so by the time an "on open" effect could
  // read document.activeElement it would already see the autofocused child, not the
  // real trigger (e.g. the FAB). Watching focusin from mount sidesteps that race.
  const lastOutsideFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[role="dialog"]')) {
        lastOutsideFocusRef.current = target;
      }
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  useEffect(() => {
    if (!open) return;

    // Hand focus back to whatever triggered the sheet when it closes.
    const previouslyFocused = lastOutsideFocusRef.current ?? (document.activeElement as HTMLElement | null);

    // Move focus into the sheet, unless a child already claimed it via autoFocus.
    const container = sheetRef.current;
    if (container && !container.contains(document.activeElement)) {
      container.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !container) return;

      // Query fresh each press: sheet content (steps, form fields) can change while open.
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      // Treat focus sitting on the container itself (no autoFocus child) as a boundary too,
      // so Shift+Tab from there wraps to the last item instead of escaping to the scrim.
      const atEdgeOrOutside = active === container || !container.contains(active);
      if (e.shiftKey) {
        if (atEdgeOrOutside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (atEdgeOrOutside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Restore focus to wherever it came from, unless that element is gone.
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* scrim */}
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0.001 } : { duration: 0.25 }}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
          />
          {/* sheet, aligned to the phone frame */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              tabIndex={-1}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 700) onClose();
              }}
              initial={reduce ? false : { y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={reduce ? { duration: 0.001 } : sheetSpring}
              className="pointer-events-auto relative w-full max-w-[440px] rounded-t-2xl bg-paper shadow-[var(--shadow-sheet)]"
              style={{ maxHeight: "92dvh" }}
            >
              {/* grab handle */}
              <div className="flex justify-center pt-3 pb-1">
                <span className="h-1.5 w-11 rounded-pill bg-line" />
              </div>
              <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" style={{ maxHeight: "calc(92dvh - 1.5rem)" }}>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

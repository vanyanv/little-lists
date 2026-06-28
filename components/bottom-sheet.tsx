"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { sheetSpring } from "@/lib/motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** small eyebrow above the title area, optional */
  ariaLabel?: string;
}

/** A native-feeling mobile sheet: scrim fade + spring slide, drag to dismiss. */
export function BottomSheet({ open, onClose, children, ariaLabel }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
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
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
          />
          {/* sheet, aligned to the phone frame */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 700) onClose();
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={sheetSpring}
              className="pointer-events-auto relative w-full max-w-[440px] rounded-t-2xl bg-paper shadow-[var(--shadow-sheet)]"
              style={{ maxHeight: "92dvh" }}
            >
              {/* grab handle */}
              <div className="flex justify-center pt-3 pb-1">
                <span className="h-1.5 w-11 rounded-pill bg-line" />
              </div>
              <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" style={{ maxHeight: "calc(92dvh - 1.5rem)" }}>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

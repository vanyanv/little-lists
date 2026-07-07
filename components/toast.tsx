"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUi } from "@/lib/ui";
import { softSpring } from "@/lib/motion";
import { focusRingOnDark } from "@/lib/a11y";

/** A tiny, warm confirmation that floats just above the bottom nav. */
export function Toast() {
  const { toast, dismissToast } = useUi();
  // The toast id whose action already fired. The exiting toast stays pointer-interactive
  // during the AnimatePresence exit (~0.5s) with a frozen onClick closure, so this shared
  // ref is what guarantees onAction runs at most once per toast instance.
  const firedActionFor = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, toast.action ? 6000 : 2400);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="relative w-full max-w-[440px]">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={softSpring}
              className="pointer-events-auto absolute inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] mx-auto flex w-fit max-w-[88%] items-center gap-2 rounded-pill bg-ink px-4 py-3 text-cream shadow-lift"
            >
              <span className="text-[0.92rem] font-bold leading-none">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    if (firedActionFor.current === toast.id) return;
                    firedActionFor.current = toast.id;
                    toast.action?.onAction();
                    dismissToast();
                  }}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-pill px-2 text-[0.92rem] font-bold leading-none text-cream underline underline-offset-2 ${focusRingOnDark}`}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUi } from "@/lib/ui";
import { softSpring } from "@/lib/motion";

/** A tiny, warm confirmation that floats just above the bottom nav. */
export function Toast() {
  const { toast, dismissToast } = useUi();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, 2400);
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
              className="pointer-events-auto absolute inset-x-0 bottom-[5.5rem] mx-auto flex w-fit max-w-[88%] items-center gap-2 rounded-pill bg-ink px-4 py-3 text-cream shadow-lift"
            >
              <span className="text-[0.92rem] font-bold leading-none">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

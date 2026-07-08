"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUi, type ToastSignal } from "@/lib/ui";
import { softSpring } from "@/lib/motion";
import { focusRingOnDark } from "@/lib/a11y";

/** A tiny, warm confirmation that floats just above the bottom nav. */
export function Toast() {
  const { toast, dismissToast } = useUi();
  // The toast id whose action already fired. The exiting toast stays pointer-interactive
  // during the AnimatePresence exit (~0.5s) with a frozen onClick closure, so this shared
  // ref is what guarantees onAction runs at most once per toast instance.
  const firedActionFor = useRef<number | null>(null);
  // The toast id whose onExpire already fired (via timeout), so the settle
  // effect below never double-commits.
  const expiredFor = useRef<number | null>(null);
  // Hovering or focusing the toast pauses auto-dismiss, so the Undo window
  // never closes under a finger or a keyboard user.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!toast || paused) return;
    const t = setTimeout(() => {
      if (firedActionFor.current !== toast.id) {
        expiredFor.current = toast.id;
        toast.onExpire?.();
      }
      dismissToast(toast.id);
    }, toast.action ? 6000 : 2400);
    return () => clearTimeout(t);
  }, [toast, paused, dismissToast]);

  // Settle a toast that disappears WITHOUT its timeout firing (replaced by a
  // newer toast, or dismissed after an action): if neither its action nor its
  // expiry ran, its pending work must still commit exactly once.
  const prevToastRef = useRef<ToastSignal | null>(null);
  useEffect(() => {
    const prev = prevToastRef.current;
    if (prev && prev.id !== toast?.id) {
      if (firedActionFor.current !== prev.id && expiredFor.current !== prev.id) {
        expiredFor.current = prev.id;
        prev.onExpire?.();
      }
    }
    prevToastRef.current = toast;
    if (toast?.id !== prev?.id) setPaused(false);
  }, [toast]);

  // Unmount safety: commit whatever is still pending.
  useEffect(
    () => () => {
      const cur = prevToastRef.current;
      if (cur && firedActionFor.current !== cur.id && expiredFor.current !== cur.id) {
        cur.onExpire?.();
      }
    },
    []
  );

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center">
      <div className="relative w-full max-w-[440px]">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96, pointerEvents: "none" }}
              transition={softSpring}
              onPointerEnter={() => setPaused(true)}
              onPointerLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
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
                    // only clear if this toast is still the live one — a fading
                    // toast's Undo must not kill a newer toast underneath it
                    dismissToast(toast.id);
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

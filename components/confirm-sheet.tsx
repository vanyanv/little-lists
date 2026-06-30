"use client";

import { motion } from "motion/react";
import { useUi } from "@/lib/ui";
import { tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";

/** A cozy confirmation sheet, summoned via useUi().openConfirm(). */
export function ConfirmSheet() {
  const { confirm, closeConfirm } = useUi();

  return (
    <BottomSheet open={confirm !== null} onClose={closeConfirm} ariaLabel={confirm?.title}>
      {confirm && (
        <div className="pt-1">
          <h2 className="font-display text-[1.4rem] font-semibold leading-tight text-ink">
            {confirm.title}
          </h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-brown">{confirm.body}</p>

          <div className="mt-6 flex flex-col gap-2.5">
            <motion.button
              type="button"
              whileTap={tap}
              onClick={() => {
                confirm.onConfirm();
                closeConfirm();
              }}
              className={`w-full rounded-pill py-4 text-[1rem] font-bold text-cream shadow-lift ${
                confirm.tone === "danger" ? "bg-rosewood" : "bg-ink"
              }`}
            >
              {confirm.confirmLabel}
            </motion.button>
            <motion.button
              type="button"
              whileTap={tap}
              onClick={closeConfirm}
              className="w-full rounded-pill py-3.5 text-[0.95rem] font-bold text-brown-soft transition-colors hover:bg-cream-deep"
            >
              Keep it
            </motion.button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

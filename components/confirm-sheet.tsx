"use client";

import { useRef } from "react";
import { useUi, type ConfirmState } from "@/lib/ui";
import { sheetTitleSm } from "@/lib/field";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";

/** A cozy confirmation sheet, summoned via useUi().openConfirm(). */
export function ConfirmSheet() {
  const { confirm, closeConfirm } = useUi();
  // The confirm instance whose onConfirm already fired. The exiting sheet stays
  // pointer-interactive during the AnimatePresence exit (~0.3s) with a frozen
  // onClick closure, so a double-tap on "Add anyway" (or any confirm) can fire
  // onConfirm twice — this ref, keyed on the confirm object's own identity,
  // guarantees it runs at most once per confirm instance. Mirrors toast.tsx's
  // firedActionFor pattern; a new openConfirm() call always creates a fresh
  // object, so the guard resets implicitly whenever a new confirm opens.
  const firedFor = useRef<ConfirmState | null>(null);

  return (
    <BottomSheet open={confirm !== null} onClose={closeConfirm} ariaLabel={confirm?.title}>
      {confirm && (
        <div className="pt-1">
          <h2 className={sheetTitleSm}>
            {confirm.title}
          </h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-brown">{confirm.body}</p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              block
              size="lg"
              variant={confirm.tone === "danger" ? "danger" : "primary"}
              onClick={() => {
                if (firedFor.current === confirm) return;
                firedFor.current = confirm;
                confirm.onConfirm();
                closeConfirm();
              }}
            >
              {confirm.confirmLabel}
            </Button>
            <Button block variant="ghost" onClick={closeConfirm}>
              Keep it
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

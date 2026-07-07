"use client";

import { useUi } from "@/lib/ui";
import { sheetTitleSm } from "@/lib/field";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";

/** A cozy confirmation sheet, summoned via useUi().openConfirm(). */
export function ConfirmSheet() {
  const { confirm, closeConfirm } = useUi();

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

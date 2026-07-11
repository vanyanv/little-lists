"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRing } from "@/lib/a11y";
import { sheetTitle } from "@/lib/field";
import { BottomSheet } from "./bottom-sheet";
import { StickerBadge } from "./icons/sticker-badge";

export function MoveItemSheet() {
  const { sheet, closeSheet, showToast } = useUi();
  const open = sheet?.kind === "move-item";
  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Move or copy to another list">
      {open && (
        <MoveItemFlow
          fromListId={sheet.listId}
          itemId={sheet.itemId}
          onClose={closeSheet}
          showToast={showToast}
        />
      )}
    </BottomSheet>
  );
}

function MoveItemFlow({
  fromListId,
  itemId,
  onClose,
  showToast,
}: {
  fromListId: string;
  itemId: string;
  onClose: () => void;
  showToast: (m: string) => void;
}) {
  const { lists, moveItem, copyItem } = useStore();
  const [mode, setMode] = useState<"move" | "copy">("move");
  const source = lists.find((l) => l.id === fromListId);
  const item = source?.items.find((i) => i.id === itemId);
  const others = lists.filter((l) => l.id !== fromListId);

  if (!item) {
    return <p className="py-6 text-center text-brown">That little thing wandered off.</p>;
  }

  const choose = async (toListId: string, toTitle: string) => {
    if (mode === "move") {
      moveItem(fromListId, itemId, toListId);
      onClose();
      showToast(`Moved to ${toTitle} ✨`);
    } else {
      onClose();
      try {
        await copyItem(item, toListId);
        showToast(`Copied to ${toTitle} ✨`);
      } catch {
        showToast("That didn't save. Let's try again 🌿");
      }
    }
  };

  return (
    <div className="pt-1">
      <h2 className={sheetTitle}>Send &ldquo;{item.title}&rdquo; somewhere</h2>

      {/* move vs copy */}
      <div className="mt-4 inline-flex rounded-pill bg-cream-deep p-0.5 ring-1 ring-line/60">
        {(["move", "copy"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-pill px-4 text-[0.85rem] font-bold capitalize transition ${focusRing} ${
              mode === m ? "bg-ink text-cream shadow-soft" : "text-brown"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[0.9rem] text-brown">
        {mode === "move" ? "It leaves this list and joins the one you pick." : "A copy is added; the original stays here."}
      </p>

      {others.length === 0 ? (
        <p className="mt-5 rounded-xl bg-cream-deep/50 p-4 text-center text-[0.92rem] text-brown">
          You only have this one little list so far. Make another to move things around.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {others.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => choose(l.id, l.title)}
              className={`flex items-center gap-3 rounded-xl bg-cream-deep/50 p-3 text-left transition hover:bg-cream-deep ${focusRing}`}
            >
              <StickerBadge emoji={l.emoji} size={34} rounded="rounded-lg" className="shadow-none" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[1rem] font-semibold text-ink">{l.title}</span>
                <span className="block text-[0.8rem] text-brown">{l.items.length} inside</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

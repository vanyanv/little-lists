"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import {
  DETECT_BATCH, POCKET_COZY_THRESHOLD, SCRAP_MAX_LENGTH,
  bestListForKind, detectScrap, isTempScrapId, scrapAge,
} from "@/lib/scraps";
import { TEMPLATE_META, type ListTemplate } from "@/lib/types";
import type { Scrap } from "@/lib/types";
import { softSpring } from "@/lib/motion";
import { inputPrimary, sheetTitle } from "@/lib/field";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { OverflowMenu } from "./overflow-menu";

// Survives sheet close/reopen: an unmounted PocketInside leaves its in-flight
// detections running, and a fresh mount must not re-request the same scraps.
const inFlightDetections = new Set<string>();

export function PocketSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "pocket";
  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Your pocket">
      {open && <PocketInside />}
    </BottomSheet>
  );
}

function PocketInside() {
  const { scraps, lists, addScrap, deleteScrap, setScrapDetection, fileScrap, addList } = useStore();
  const { showToast, openScrapFiling } = useUi();
  const [text, setText] = useState("");
  const [now] = useState(() => new Date());

  const jot = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText(""); // clear right away — the pocket is for rapid brain-dumps
    try {
      await addScrap(value);
    } catch {
      setText(value); // hand their words back rather than losing them
      showToast("That didn't save. Let's try again 🌿");
    }
  };

  const remove = (scrap: Scrap) => {
    const handle = deleteScrap(scrap.id);
    showToast("Scrap tossed", {
      action: { label: "Undo", onAction: handle.undo },
      onExpire: handle.commit,
    });
  };

  // Lazy, once-ever detection: check up to DETECT_BATCH unchecked scraps per
  // open; results (including "none") persist, so this converges to no work.
  useEffect(() => {
    const pending = scraps
      .filter((s) => s.detection === null && !isTempScrapId(s.id) && !inFlightDetections.has(s.id))
      .slice(0, DETECT_BATCH);
    for (const s of pending) {
      inFlightDetections.add(s.id);
      void detectScrap(s.text)
        .then((result) => setScrapDetection(s.id, result))
        .catch(() => {
          /* all providers down — stay unchecked, retry next open */
        })
        .finally(() => inFlightDetections.delete(s.id));
    }
  }, [scraps, setScrapDetection]);

  const fileFromChip = async (scrap: Scrap) => {
    const d = scrap.detection;
    if (!d || "none" in d) return;
    const template = d.kind as ListTemplate;
    const tm = TEMPLATE_META[template];
    let target = bestListForKind(lists, d.kind);
    if (!target) {
      try {
        target = await addList({
          title: tm.label,
          emoji: tm.emoji,
          theme: tm.theme,
          template,
          defaultView: tm.defaultView,
        });
      } catch {
        showToast("That didn't save. Let's try again 🌿");
        return;
      }
    }
    const handle = fileScrap(scrap.id, target.id, {
      type: d.kind,
      title: d.title,
      subtitle: d.subtitle || undefined,
      status: tm.statuses[0],
      seed: d.title,
      imageUrl: d.imageUrl,
      meta: d.meta,
    });
    showToast(`Filed into ${target.title} ✨`, {
      action: { label: "Undo", onAction: handle.undo },
      onExpire: handle.commit,
    });
  };

  return (
    <div className="pt-1">
      <h2 className={sheetTitle}>Your pocket</h2>
      <p className="mt-1 text-[0.92rem] text-brown">
        Jot it now, tuck it into a list later.
      </p>

      <form onSubmit={jot} className="mt-4 flex gap-2">
        <input
          autoFocus
          aria-label="Jot it down"
          value={text}
          maxLength={SCRAP_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder="Jot it down before it flits off…"
          className={`flex-1 ${inputPrimary}`}
        />
        <Button type="submit" size="md" disabled={!text.trim()} className="shrink-0 self-stretch">
          Save
        </Button>
      </form>

      <div className="mt-5">
        {scraps.length === 0 ? (
          <p className="px-1 py-6 text-center text-[0.9rem] text-brown">
            Nothing tucked away. Jot the next little thing ✨
          </p>
        ) : (
          <>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
              {scraps.length >= POCKET_COZY_THRESHOLD
                ? "your pocket's getting cozy — tuck a few into lists? 🌿"
                : scraps.length === 1
                  ? "1 scrap waiting"
                  : `${scraps.length} scraps waiting`}
            </p>
            <AnimatePresence initial={false}>
              {scraps.map((s) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={softSpring}
                  className="mb-2 flex items-center gap-2 rounded-xl bg-cream-deep/40 p-2.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      openScrapFiling({
                        id: s.id,
                        text: s.text,
                        kind: s.detection && !("none" in s.detection) ? s.detection.kind : undefined,
                      })
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[0.95rem] font-semibold text-ink">{s.text}</p>
                    <p className="text-[0.78rem] font-medium text-brown-soft">{scrapAge(s.createdAt, now)}</p>
                  </button>
                  {s.detection && !("none" in s.detection) && (
                    <button
                      type="button"
                      onClick={() => void fileFromChip(s)}
                      className="shrink-0 rounded-pill bg-cream-deep px-2.5 py-1.5 text-[0.78rem] font-bold text-ink ring-1 ring-line/60 transition hover:bg-cream-deep/70"
                    >
                      →{" "}
                      {bestListForKind(lists, s.detection.kind)?.title ??
                        `new ${TEMPLATE_META[s.detection.kind as ListTemplate].label}`}
                      ?
                    </button>
                  )}
                  <OverflowMenu
                    ariaLabel={`Options for ${s.text}`}
                    items={[{ label: "Toss it", tone: "danger", onSelect: () => remove(s) }]}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

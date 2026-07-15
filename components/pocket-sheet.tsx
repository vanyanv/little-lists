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
import type { List, Scrap } from "@/lib/types";
import { softSpring } from "@/lib/motion";
import { inputPrimary, sheetTitle } from "@/lib/field";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { LittleIcon } from "./icons";
import { OverflowMenu } from "./overflow-menu";

// Survives sheet close/reopen: an unmounted PocketInside leaves its in-flight
// detections running, and a fresh mount must not re-request the same scraps.
const inFlightDetections = new Set<string>();

// One-tap chips: a second tap during the exit animation would file twice.
const filingScraps = new Set<string>();

// One list create per kind, shared: two same-kind chips tapped while the
// first create is in flight join the same new list instead of racing two
// into existence.
const pendingListCreates = new Map<string, Promise<List>>();

export function PocketSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "pocket";
  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Save a little thing">
      {open && <PocketInside />}
    </BottomSheet>
  );
}

function PocketInside() {
  const { scraps, lists, addScrap, deleteScrap, setScrapDetection, fileScrap, addList } = useStore();
  const { showToast, openScrapFiling, openListSheet } = useUi();
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
    if (filingScraps.has(scrap.id)) return;
    filingScraps.add(scrap.id);
    const template = d.kind as ListTemplate;
    const tm = TEMPLATE_META[template];
    let target = bestListForKind(lists, d.kind);
    if (!target) {
      try {
        let creating = pendingListCreates.get(d.kind);
        if (!creating) {
          creating = addList({
            title: tm.label,
            emoji: tm.emoji,
            theme: tm.theme,
            template,
            defaultView: tm.defaultView,
          });
          pendingListCreates.set(d.kind, creating);
          const clear = () => pendingListCreates.delete(d.kind);
          creating.then(clear, clear);
        }
        target = await creating;
      } catch {
        showToast("That didn't save. Let's try again 🌿");
        filingScraps.delete(scrap.id);
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
      action: {
        label: "Undo",
        onAction: () => {
          filingScraps.delete(scrap.id);
          handle.undo();
        },
      },
      onExpire: () => {
        filingScraps.delete(scrap.id);
        handle.commit();
      },
    });
  };

  return (
    <div className="pt-1">
      <h2 className={sheetTitle}>Save a little thing</h2>
      <p className="mt-1 text-[0.92rem] text-brown">
        Jot it now. Tuck it into a list whenever you like.
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

      <button
        type="button"
        onClick={() => openListSheet()}
        className="mt-2 flex min-h-11 items-center px-1 text-[0.85rem] font-semibold text-brown-soft transition-colors hover:text-brown"
      >
        or start a whole little list →
      </button>

      <div className="mt-5">
        <h3 className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          Your pocket
        </h3>
        {scraps.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-line">
            <LittleIcon
              name="sparkle"
              size={56}
              className="pointer-events-none absolute -right-2 -top-3 opacity-20"
              rotate={-10}
            />
            <p className="font-display text-[1.05rem] font-semibold text-ink">This is your pocket ✨</p>
            <p className="mt-1 text-[0.88rem] text-brown">
              Anything you jot lands here safe. When you&rsquo;re ready, we&rsquo;ll help you tuck it into the
              right list.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[0.85rem] font-medium text-brown-soft">
              {scraps.length >= POCKET_COZY_THRESHOLD
                ? "your pocket's getting cozy — tuck a few into lists? 🌿"
                : scraps.length === 1
                  ? "1 scrap waiting"
                  : `${scraps.length} scraps waiting`}
            </p>
            <AnimatePresence initial={false}>
              {scraps.map((s) => {
                const temp = isTempScrapId(s.id);
                return (
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
                    disabled={temp}
                    onClick={() =>
                      openScrapFiling({
                        id: s.id,
                        text: s.text,
                        kind: s.detection && !("none" in s.detection) ? s.detection.kind : undefined,
                      })
                    }
                    className="min-w-0 flex-1 text-left transition-opacity disabled:opacity-55"
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
                  {!temp && (
                    <OverflowMenu
                      ariaLabel={`Options for ${s.text}`}
                      items={[{ label: "Toss it", tone: "danger", onSelect: () => remove(s) }]}
                    />
                  )}
                </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Item } from "@/lib/types";
import { ITEM_TYPE_META, STATUSES_FOR } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRing, focusRingOnDark } from "@/lib/a11y";
import { ExpandableCard } from "./expandable-card";
import { PosterCard } from "./poster-card";
import { NoteCard } from "./note-card";
import { CompactRow } from "./compact-row";
import { StatusPill } from "./status-pill";
import { SparkleBurst } from "./sparkle-burst";
import type { ViewMode } from "./view-toggle";

const NOTE_EMOJI_CHOICES = ["✨", "🍴", "📍", "🎁", "🌷", "☕", "🍵", "🌿", "🏞️", "💌", "🐾", "🌙"];

function ItemEditor({ listId, item }: { listId: string; item: Item }) {
  const { updateItem, deleteItem } = useStore();
  const { openConfirm, showToast } = useUi();
  const options = STATUSES_FOR[item.type];
  const isNote = ITEM_TYPE_META[item.type].aspect === "note";

  return (
    <div className="mt-3 rounded-xl bg-cream-deep/60 p-3.5">
      {/* title */}
      <label htmlFor={`item-title-${item.id}`} className="mb-1.5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">the name</label>
      <input
        id={`item-title-${item.id}`}
        defaultValue={item.title}
        onChange={(e) => updateItem(listId, item.id, { title: e.target.value })}
        className={`w-full rounded-lg border border-line bg-paper px-3 py-2 text-[0.95rem] font-medium text-ink focus:border-[var(--t-edge)] focus:outline-none ${focusRing}`}
      />

      {/* emoji — note-type items only */}
      {isNote && (
        <>
          <p className="mb-1.5 mt-3.5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">its little face</p>
          <div role="group" aria-label="its little face" className="grid grid-cols-6 gap-1.5">
            {NOTE_EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={e}
                aria-pressed={item.emoji === e}
                onClick={() => updateItem(listId, item.id, { emoji: e })}
                className={`grid aspect-square place-items-center rounded-lg text-xl transition ${focusRing} ${
                  item.emoji === e ? "bg-cream-deep ring-2 ring-ink/20" : "bg-cream-deep/40"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}

      {/* status */}
      <div role="group" aria-label="how do you feel about it?" className="mt-3.5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">how do you feel about it?</p>
        <div className="flex flex-wrap gap-1.5">
          {options.map((s) => {
            const selected = item.status === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={selected}
                onClick={() => updateItem(listId, item.id, { status: s })}
                className={`rounded-pill transition ${focusRing} ${selected ? "ring-2 ring-ink/20" : "opacity-55 hover:opacity-90"}`}
              >
                <StatusPill status={s} />
              </button>
            );
          })}
        </div>
      </div>

      {/* note */}
      <label htmlFor={`item-note-${item.id}`} className="mb-1.5 mt-3.5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a little note</label>
      <textarea
        id={`item-note-${item.id}`}
        defaultValue={item.note ?? ""}
        onChange={(e) => updateItem(listId, item.id, { note: e.target.value })}
        placeholder="Add a note so future you remembers why ✨"
        rows={2}
        className={`w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[0.9rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none ${focusRing}`}
      />

      {/* tags */}
      <label htmlFor={`item-tags-${item.id}`} className="mb-1.5 mt-3.5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">tags (optional)</label>
      <input
        id={`item-tags-${item.id}`}
        defaultValue={(item.tags ?? []).join(", ")}
        onChange={(e) =>
          updateItem(listId, item.id, {
            tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
          })
        }
        placeholder="comma, separated, little, labels"
        className={`w-full rounded-lg border border-line bg-paper px-3 py-2 text-[0.9rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none ${focusRing}`}
      />

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() =>
            openConfirm({
              title: "Remove this little thing?",
              body: "It'll be gone from this little list.",
              confirmLabel: "Remove",
              tone: "danger",
              onConfirm: () => {
                deleteItem(listId, item.id);
                showToast("Removed from your little world");
              },
            })
          }
          className={`rounded-pill px-3 py-1.5 text-[0.78rem] font-bold text-brown-soft transition-colors hover:bg-cream-deep hover:text-ink ${focusRing}`}
        >
          Remove from this little list
        </button>
      </div>
    </div>
  );
}

/** Square cover tile for non-media items shown in the visual Grid view. */
function GridTile({ item }: { item: Item }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-paper shadow-soft ring-1 ring-line/30">
      <div className="grid aspect-square place-items-center text-4xl" style={{ background: "var(--t-bg)" }}>
        {item.emoji ?? "✨"}
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 font-display text-[0.95rem] font-semibold leading-tight text-ink">
          {item.title}
        </h3>
        {item.status && (
          <div className="mt-1.5">
            <StatusPill status={item.status} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ItemCard({ listId, item, view }: { listId: string; item: Item; view: ViewMode }) {
  const isMedia = ITEM_TYPE_META[item.type].aspect !== "note";
  const [sparkle, setSparkle] = useState(Boolean(item.fresh));

  useEffect(() => {
    if (!item.fresh) return;
    const t = setTimeout(() => setSparkle(false), 1000);
    return () => clearTimeout(t);
  }, [item.fresh]);

  let summary;
  let chrome = "";
  if (view === "grid") {
    summary = isMedia ? <PosterCard item={item} /> : <GridTile item={item} />;
  } else if (view === "list") {
    summary = <CompactRow item={item} />;
    chrome = "rounded-2xl bg-paper px-3 py-2 shadow-soft ring-1 ring-line/30";
  } else {
    summary = <NoteCard item={item} />;
    chrome = "rounded-2xl bg-paper p-3.5 shadow-soft ring-1 ring-line/30";
  }

  return (
    <div className="relative">
      {sparkle && <SparkleBurst />}
      <ExpandableCard
        className={chrome}
        summary={summary}
        detail={<ItemEditor listId={listId} item={item} />}
      />
    </div>
  );
}

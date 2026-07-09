"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item, StatusId } from "@/lib/types";
import { ITEM_TYPE_META } from "@/lib/types";
import { EXAMPLE_TAG, isExample } from "@/lib/onboarding";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRing } from "@/lib/a11y";
import { ExampleChip } from "./chip";
import { ExpandableCard } from "./expandable-card";
import { PosterCard } from "./poster-card";
import { NoteCard } from "./note-card";
import { CompactRow } from "./compact-row";
import { StatusPill } from "./status-pill";
import { SaveSparkle } from "./icons/save-sparkle";
import { LittleIcon } from "./icons/little-icon";
import type { ViewMode } from "./view-toggle";

const NOTE_EMOJI_CHOICES = ["✨", "🍴", "📍", "🎁", "🌷", "☕", "🍵", "🌿", "🏞️", "💌", "🐾", "🌙"];

function ItemEditor({
  listId,
  item,
  statuses,
}: {
  listId: string;
  item: Item;
  statuses: StatusId[];
}) {
  const { addItem, updateItem, deleteItem } = useStore();
  const { showToast } = useUi();
  const options = statuses;
  const isNote = ITEM_TYPE_META[item.type].aspect === "note";

  // Local state for the free-text fields so typing stays snappy. Each keystroke
  // updates the store optimistically (so the card summary tracks live) but the
  // server write is debounced to a single trailing call — see queueEdit/flush.
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note ?? "");
  const [tagsText, setTagsText] = useState(
    (item.tags ?? []).filter((t) => t !== EXAMPLE_TAG).join(", ")
  );

  const pendingRef = useRef<Partial<Item>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (Object.keys(pendingRef.current).length > 0) {
      updateItem(listId, item.id, pendingRef.current);
      pendingRef.current = {};
    }
  }, [listId, item.id, updateItem]);

  const queueEdit = useCallback(
    (patch: Partial<Item>) => {
      updateItem(listId, item.id, patch, { persist: false }); // optimistic, no write yet
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 600);
    },
    [listId, item.id, updateItem, flush]
  );

  // flush any pending trailing write when the editor closes / unmounts
  useEffect(() => flush, [flush]);

  // preserve the internal "example" marker (never shown, never typed) on save
  const tagsFromText = (text: string): string[] => {
    const parsed = text.split(",").map((t) => t.trim()).filter(Boolean);
    return isExample(item.tags) ? [...parsed, EXAMPLE_TAG] : parsed;
  };

  return (
    <div className="mt-3 rounded-xl bg-cream-deep/60 p-3.5">
      {/* title */}
      <label htmlFor={`item-title-${item.id}`} className="mb-1.5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">the name</label>
      <input
        id={`item-title-${item.id}`}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          queueEdit({ title: e.target.value });
        }}
        onBlur={flush}
        className={`w-full rounded-lg border border-line bg-paper px-3 py-2 text-[1rem] font-medium text-ink focus:border-brown-soft/50 focus:outline-none ${focusRing}`}
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
                className={`-my-0.5 flex min-h-11 items-center rounded-pill transition ${focusRing} ${selected ? "ring-2 ring-ink/20" : "opacity-55 hover:opacity-90"}`}
              >
                <StatusPill status={s} />
              </button>
            );
          })}
        </div>
      </div>

      {/* rating */}
      <div role="group" aria-label="your little rating" className="mt-3.5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a little rating</p>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (item.rating ?? 0) >= n;
            return (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} of 5`}
                aria-pressed={filled}
                onClick={() =>
                  updateItem(listId, item.id, { rating: item.rating === n ? 0 : n })
                }
                className={`grid h-11 w-11 place-items-center rounded-lg transition ${focusRing}`}
              >
                <span
                  className={`transition-opacity ${filled ? "opacity-100" : "opacity-25"}`}
                  style={{ color: "var(--color-rating)" }}
                >
                  <LittleIcon name="star-tiny" size={22} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* note */}
      <label htmlFor={`item-note-${item.id}`} className="mb-1.5 mt-3.5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a little note</label>
      <textarea
        id={`item-note-${item.id}`}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          queueEdit({ note: e.target.value });
        }}
        onBlur={flush}
        placeholder="Add a note so future you remembers why ✨"
        rows={2}
        className={`w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[1rem] text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none ${focusRing}`}
      />

      {/* little labels */}
      <label htmlFor={`item-tags-${item.id}`} className="mb-1.5 mt-3.5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">little labels (optional)</label>
      <input
        id={`item-tags-${item.id}`}
        value={tagsText}
        onChange={(e) => {
          setTagsText(e.target.value);
          queueEdit({ tags: tagsFromText(e.target.value) });
        }}
        onBlur={flush}
        placeholder="like a person, a mood, a someday…"
        className={`w-full rounded-lg border border-line bg-paper px-3 py-2 text-[1rem] text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none ${focusRing}`}
      />

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => {
            // Snapshot the item's fields before it's gone, so Undo can re-land it
            // in this same list. A new id is fine; every visible field is restored.
            const snapshot = item;
            const restore = () => {
              addItem(listId, {
                type: snapshot.type,
                title: snapshot.title,
                subtitle: snapshot.subtitle,
                note: snapshot.note,
                status: snapshot.status,
                tags: snapshot.tags,
                emoji: snapshot.emoji,
                seed: snapshot.seed,
                imageUrl: snapshot.imageUrl,
                ...(snapshot.rating != null ? { meta: { rating: snapshot.rating } } : {}),
              }).catch(() => showToast("That didn't save. Let's try again 🌿"));
            };
            deleteItem(listId, snapshot.id).catch(() =>
              showToast("That didn't save. Let's try again 🌿")
            );
            showToast("Removed from this little list", {
              action: { label: "Undo", onAction: restore },
            });
          }}
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
        {item.emoji ?? <LittleIcon name="sparkle" size={40} />}
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
        {isExample(item.tags) && (
          <div className="mt-1.5">
            <ExampleChip />
          </div>
        )}
      </div>
    </div>
  );
}

export function ItemCard({
  listId,
  item,
  view,
  statuses,
}: {
  listId: string;
  item: Item;
  view: ViewMode;
  statuses: StatusId[];
}) {
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
      {sparkle && <SaveSparkle />}
      {/* visible tap-to-edit hint, so expanding is discoverable (not hover-only) */}
      {view !== "list" && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-2 z-[1] grid h-6 w-6 place-items-center rounded-full bg-paper/85 text-brown-soft shadow-soft ring-1 ring-line/40 backdrop-blur-sm"
        >
          <LittleIcon name="pencil" size={12} />
        </span>
      )}
      <ExpandableCard
        className={chrome}
        summary={summary}
        detail={<ItemEditor listId={listId} item={item} statuses={statuses} />}
      />
    </div>
  );
}

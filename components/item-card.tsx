"use client";

import { useEffect, useState } from "react";
import type { Item } from "@/lib/types";
import { ITEM_TYPE_META, STATUSES_FOR } from "@/lib/types";
import { useStore } from "@/lib/store";
import { ExpandableCard } from "./expandable-card";
import { PosterCard } from "./poster-card";
import { NoteCard } from "./note-card";
import { CompactRow } from "./compact-row";
import { StatusPill } from "./status-pill";
import { SparkleBurst } from "./sparkle-burst";
import type { ViewMode } from "./view-toggle";

function ItemEditor({ listId, item }: { listId: string; item: Item }) {
  const { updateItem } = useStore();
  const options = STATUSES_FOR[item.type];

  return (
    <div className="mt-3 rounded-xl bg-cream-deep/60 p-3.5">
      <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
        how do you feel about it?
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((s) => {
          const selected = item.status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => updateItem(listId, item.id, { status: s })}
              className={`rounded-pill transition ${
                selected ? "ring-2 ring-ink/20" : "opacity-55 hover:opacity-90"
              }`}
            >
              <StatusPill status={s} />
            </button>
          );
        })}
      </div>

      <p className="mb-1.5 mt-3.5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
        a little note
      </p>
      <textarea
        defaultValue={item.note ?? ""}
        onChange={(e) => updateItem(listId, item.id, { note: e.target.value })}
        placeholder="Add a note so future you remembers why ✨"
        rows={2}
        className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[0.9rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />
    </div>
  );
}

/** Square cover tile for non-media items shown in the visual Grid view. */
function GridTile({ item }: { item: Item }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-paper shadow-soft ring-1 ring-line/60">
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
    chrome = "rounded-2xl bg-paper px-3 py-2 shadow-soft ring-1 ring-line/60";
  } else {
    summary = <NoteCard item={item} />;
    chrome = "rounded-2xl bg-paper p-3.5 shadow-soft ring-1 ring-line/60";
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

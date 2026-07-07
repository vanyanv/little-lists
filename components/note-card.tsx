import type { Item } from "@/lib/types";
import { ITEM_TYPE_META } from "@/lib/types";
import { Cover } from "./cover";
import { StatusPill } from "./status-pill";
import { StickerBadge } from "./icons/sticker-badge";

/** Cozy note-style summary — a mini cover for media, a sticker tile for everything else. */
export function NoteCard({ item }: { item: Item }) {
  const isMedia = ITEM_TYPE_META[item.type].aspect !== "note";
  return (
    <div className="flex gap-3.5 text-left">
      {isMedia ? (
        <div className="w-12 shrink-0">
          <Cover
            item={item}
            rounded="rounded-lg"
            className="shadow-soft ring-1 ring-line/50"
            sizes="48px"
          />
        </div>
      ) : (
        <StickerBadge emoji={item.emoji} tone="wash" size={56} rounded="rounded-xl" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <h3 className="flex-1 font-display text-[1.02rem] font-semibold leading-snug text-ink">
            {item.title}
          </h3>
          {item.status && <StatusPill status={item.status} />}
        </div>
        {item.subtitle && (
          <p className="mt-0.5 text-[0.82rem] font-semibold text-brown-soft">{item.subtitle}</p>
        )}
        {item.note && (
          <p className="mt-1 line-clamp-2 text-[0.88rem] leading-relaxed text-brown">{item.note}</p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded-pill px-2.5 py-1 text-[0.75rem] font-semibold text-[var(--t-ink)]"
                style={{ background: "var(--t-bg)" }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

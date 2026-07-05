import type { Item } from "@/lib/types";
import { ITEM_TYPE_META } from "@/lib/types";
import { Cover } from "./cover";
import { StatusPill } from "./status-pill";
import { LittleIcon } from "./icons/little-icon";
import { StickerBadge } from "./icons/sticker-badge";

/** A soft, scannable row for thumb-scrolling a big list of movies or books. */
export function CompactRow({ item }: { item: Item }) {
  const isMedia = ITEM_TYPE_META[item.type].aspect !== "note";
  return (
    <div className="flex items-center gap-3 text-left">
      {isMedia ? (
        <div className="w-8 shrink-0">
          <Cover
            item={item}
            rounded="rounded-md"
            className="shadow-soft ring-1 ring-line/50"
            sizes="32px"
          />
        </div>
      ) : (
        <StickerBadge emoji={item.emoji} tone="wash" size={40} rounded="rounded-xl" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-display text-[0.98rem] font-semibold leading-tight text-ink">
            {item.title}
          </h3>
          {item.rating ? (
            <span
              role="img"
              className="flex shrink-0 items-center gap-px leading-none"
              style={{ color: "var(--color-rating)" }}
              aria-label={`${item.rating} stars`}
            >
              {Array.from({ length: item.rating }, (_, i) => (
                <LittleIcon key={i} name="star-tiny" size={11} />
              ))}
            </span>
          ) : (
            item.status === "favorite" && (
              <span role="img" className="shrink-0 leading-none text-rosewood" aria-label="favorite">
                <LittleIcon name="heart-tiny" size={11} />
              </span>
            )
          )}
          {item.note && (
            <span role="img" className="shrink-0 text-brown opacity-55" aria-label="has a note">
              <LittleIcon name="pencil" size={12} />
            </span>
          )}
        </div>
        {item.subtitle && (
          <p className="mt-0.5 truncate text-[0.82rem] font-semibold text-brown-soft">{item.subtitle}</p>
        )}
      </div>

      {item.status && (
        <div className="shrink-0">
          <StatusPill status={item.status} />
        </div>
      )}
    </div>
  );
}

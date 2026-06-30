import type { Item } from "@/lib/types";
import { ITEM_TYPE_META } from "@/lib/types";
import { PlaceholderPoster } from "./placeholder-poster";
import { StatusPill } from "./status-pill";

/** A soft, scannable row for thumb-scrolling a big list of movies or books. */
export function CompactRow({ item }: { item: Item }) {
  const isMedia = ITEM_TYPE_META[item.type].aspect !== "note";
  return (
    <div className="flex items-center gap-3 text-left">
      {isMedia ? (
        <div className="w-8 shrink-0">
          <PlaceholderPoster
            seed={item.seed || item.title}
            title={item.title}
            rounded="rounded-md"
            className="shadow-soft ring-1 ring-black/5"
          />
        </div>
      ) : (
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl"
          style={{ background: "var(--t-bg)" }}
        >
          {item.emoji ?? "✨"}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-display text-[0.98rem] font-semibold leading-tight text-ink">
            {item.title}
          </h3>
          {item.rating ? (
            <span
              role="img"
              className="shrink-0 text-[0.74rem] leading-none"
              style={{ color: "oklch(0.72 0.13 75)" }}
              aria-label={`${item.rating} stars`}
            >
              {"★".repeat(item.rating)}
            </span>
          ) : (
            item.status === "favorite" && (
              <span role="img" className="shrink-0 text-[0.74rem] leading-none" aria-label="favorite">
                💗
              </span>
            )
          )}
          {item.note && (
            <span role="img" className="shrink-0 text-[0.72rem] opacity-55" aria-label="has a note">
              📝
            </span>
          )}
        </div>
        {item.subtitle && (
          <p className="mt-0.5 truncate text-[0.8rem] font-medium text-brown">{item.subtitle}</p>
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

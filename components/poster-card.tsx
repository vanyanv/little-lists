import type { Item } from "@/lib/types";
import { Cover } from "./cover";
import { StatusPill } from "./status-pill";
import { LittleIcon } from "./icons/little-icon";

/** Letterboxd-style poster/cover summary for movies, books, and music. */
export function PosterCard({ item }: { item: Item }) {
  return (
    <div className="text-left">
      <Cover
        item={item}
        badge={
          item.status === "favorite" ? (
            <LittleIcon name="heart-tiny" size={13} className="text-rosewood" />
          ) : undefined
        }
        className="shadow-soft ring-1 ring-line/50"
      />
      <div className="mt-2.5 px-0.5">
        <div className="flex items-start gap-1">
          <h3 className="line-clamp-2 flex-1 font-display text-[0.98rem] font-semibold leading-tight text-ink">
            {item.title}
          </h3>
          {item.note && (
            <span role="img" className="mt-0.5 text-brown opacity-60" aria-label="has a note">
              <LittleIcon name="pencil" size={13} />
            </span>
          )}
        </div>
        {item.subtitle && (
          <p className="mt-0.5 text-[0.8rem] font-medium text-brown">{item.subtitle}</p>
        )}
        {item.status && (
          <div className="mt-1.5">
            <StatusPill status={item.status} />
          </div>
        )}
      </div>
    </div>
  );
}

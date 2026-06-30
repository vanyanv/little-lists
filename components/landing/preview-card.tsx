import type { List, Person } from "@/lib/types";
import { TEMPLATE_META } from "@/lib/types";
import { listCountLabel, themeClass } from "@/lib/visual";
import { CardStack } from "@/components/card-stack";
import { Sticker } from "@/components/sticker";
import { ViewIcon } from "@/components/view-toggle";

/* Presentational twins of ListCard / PersonCard for the marketing preview.
   They reproduce the real cards' look but drop the <Link>, store/ui context,
   overflow menu, and hover motion, so they render with zero auth or data deps
   inside the static landing page. Keep these in visual sync with the originals. */

function EmojiTile({ emoji, size = 46 }: { emoji: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-paper shadow-soft"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {emoji}
    </span>
  );
}

function ListMeta({ list, size = "normal" }: { list: List; size?: "hero" | "normal" }) {
  const meta = TEMPLATE_META[list.template];
  const view = list.defaultView ?? meta.defaultView;
  return (
    <div className={`flex items-center gap-1.5 ${size === "hero" ? "mt-2" : "mt-1.5"}`}>
      <span
        className="rounded-pill px-2 py-0.5 text-[0.68rem] font-bold text-[var(--t-ink)]"
        style={{ background: "var(--t-wash)" }}
      >
        {meta.label}
      </span>
      <span className="text-[var(--t-ink)] opacity-70">
        <ViewIcon mode={view} size={13} />
      </span>
    </div>
  );
}

export function PreviewListCard({ list, variant = "normal" }: { list: List; variant?: "hero" | "normal" }) {
  const hero = variant === "hero";
  return (
    <div className={`block rounded-2xl ${themeClass(list.theme)}`}>
      <div
        className="relative overflow-hidden rounded-2xl shadow-soft ring-1 ring-line/30"
        style={{ background: "var(--t-bg)" }}
      >
        <Sticker
          name={TEMPLATE_META[list.template].sticker}
          size={hero ? 64 : 44}
          className="pointer-events-none absolute -right-3 -top-2 opacity-25"
          rotate={12}
        />

        {hero ? (
          <div className="relative flex items-end justify-between gap-3 p-5">
            <div className="min-w-0 flex-1">
              <EmojiTile emoji={list.emoji} size={52} />
              <h3 className="mt-3 font-display text-[1.4rem] font-semibold leading-[1.12] text-[var(--t-ink)]">
                {list.title}
              </h3>
              <p className="mt-1 text-[0.9rem] font-semibold text-brown">{listCountLabel(list)}</p>
              <ListMeta list={list} size="hero" />
            </div>
            <div className="shrink-0 pb-1">
              <CardStack items={list.items} kind={list.kind} size="lg" />
            </div>
          </div>
        ) : (
          <div className="relative p-4">
            <div className="flex items-start justify-between gap-2">
              <EmojiTile emoji={list.emoji} />
              <div className="pt-0.5">
                <CardStack items={list.items.slice(0, 3)} kind={list.kind} size="sm" />
              </div>
            </div>
            <h3 className="mt-3 font-display text-[1.12rem] font-semibold leading-tight text-[var(--t-ink)]">
              {list.title}
            </h3>
            <p className="mt-0.5 text-[0.82rem] font-semibold text-brown">{listCountLabel(list)}</p>
            <ListMeta list={list} />
          </div>
        )}
      </div>
    </div>
  );
}

export function PreviewPersonCard({ person }: { person: Person }) {
  const chips = person.sections.filter((s) => s.entries.length > 0).slice(0, 5);
  return (
    <div className={`block rounded-2xl ${themeClass(person.theme)}`}>
      <div
        className="relative rounded-2xl p-4 shadow-soft ring-1 ring-line/30"
        style={{ background: "var(--t-bg)" }}
      >
        <div className="flex items-center gap-3.5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-paper text-2xl shadow-soft">
            {person.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[1.2rem] font-semibold leading-tight text-[var(--t-ink)]">
              {person.name}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[0.86rem] font-medium text-brown">{person.note}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((s) => (
            <span
              key={s.id}
              className="rounded-pill bg-paper/70 px-2.5 py-1 text-[0.72rem] font-semibold text-[var(--t-ink)]"
            >
              {s.emoji} {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

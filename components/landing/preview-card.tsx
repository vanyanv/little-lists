import type { Item, List, Person } from "@/lib/types";
import { TEMPLATE_META } from "@/lib/types";
import { listCountLabel, themeClass } from "@/lib/visual";
import { CardStack } from "@/components/card-stack";
import { Cover } from "@/components/cover";
import { StatusPill } from "@/components/status-pill";
import { Sticker } from "@/components/sticker";
import { StickerBadge } from "@/components/icons/sticker-badge";
import { CategoryIcon, CATEGORY_GLYPH } from "@/components/icons/category-icon";
import { ViewIcon } from "@/components/view-toggle";
import { CyclingName } from "./cycling-name";

/* Presentational twins of ListCard / PersonCard for the marketing preview.
   They reproduce the real cards' look but drop the <Link>, store/ui context,
   overflow menu, and hover motion, so they render with zero auth or data deps
   inside the static landing page. Keep these in visual sync with the originals.
   Faces use the drawn glyphs (StickerBadge without an emoji) so the preview
   shows the house iconography, not whatever emoji the sample data carries. */

function ListMeta({ list, size = "normal" }: { list: List; size?: "hero" | "normal" }) {
  const meta = TEMPLATE_META[list.template];
  const view = list.defaultView ?? meta.defaultView;
  return (
    <div className={`flex items-center gap-1.5 ${size === "hero" ? "mt-2" : "mt-1.5"}`}>
      <span
        className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[0.68rem] font-bold text-[var(--t-ink)]"
        style={{ background: "var(--t-wash)" }}
      >
        <CategoryIcon id={list.template} size={11} />
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
  const glyph = CATEGORY_GLYPH[list.template];
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
              <StickerBadge icon={glyph} size={52} rounded="rounded-xl" />
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
              <StickerBadge icon={glyph} size={46} rounded="rounded-xl" />
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

/** Mini twin of PosterCard for the phone preview's list-detail screen. */
export function PreviewPosterCard({ item }: { item: Item }) {
  return (
    <div className="text-left">
      <Cover item={item} sizes="130px" className="shadow-soft ring-1 ring-line/50" />
      <div className="mt-1.5 px-0.5">
        <h4 className="line-clamp-1 font-display text-[0.84rem] font-semibold leading-tight text-ink">
          {item.title}
        </h4>
        {item.status && (
          <div className="mt-1">
            <StatusPill status={item.status} />
          </div>
        )}
      </div>
    </div>
  );
}

export function PreviewPersonCard({ person, maxChips = 5 }: { person: Person; maxChips?: number }) {
  const chips = person.sections.filter((s) => s.entries.length > 0).slice(0, maxChips);
  return (
    <div className={`block rounded-2xl ${themeClass(person.theme)}`}>
      <div
        className="relative rounded-2xl p-4 shadow-soft ring-1 ring-line/30"
        style={{ background: "var(--t-bg)" }}
      >
        <div className="flex items-center gap-3.5">
          <StickerBadge icon="flower" size={56} />
          <div className="min-w-0">
            <h3 className="font-display text-[1.2rem] font-semibold leading-tight text-[var(--t-ink)]">
              Little things about <CyclingName />
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[0.86rem] font-medium text-brown">{person.note}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-pill bg-paper/70 px-2.5 py-1 text-[0.72rem] font-semibold text-[var(--t-ink)]"
            >
              <CategoryIcon id={s.id} size={11} /> {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

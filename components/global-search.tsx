"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRing } from "@/lib/a11y";
import { useComboboxNav } from "@/lib/use-combobox-nav";
import { searchLittleWorld, type LocalHit } from "@/lib/search/local";
import { scrapAge } from "@/lib/scraps";
import { ITEM_TYPE_META } from "@/lib/types";
import { trackProductEvent } from "@/lib/analytics-client";

const LISTBOX_ID = "global-search-listbox";

/** a stable DOM id per hit for role="option" + aria-activedescendant */
function optionId(hit: LocalHit): string {
  return `gs-opt-${hit.kind}-${hit.id}`;
}

/** the leading visual, title, and muted context line a hit renders as */
function describeHit(hit: LocalHit, now: Date): { emoji: string; imageUrl?: string; title: string; context?: string } {
  switch (hit.kind) {
    case "list":
      return { emoji: hit.list.emoji, title: hit.list.title };
    case "item":
      return {
        emoji: hit.item.emoji || ITEM_TYPE_META[hit.item.type].emoji,
        imageUrl: hit.item.imageUrl,
        title: hit.item.title,
        context: `in ${hit.list.title}`,
      };
    case "person":
      return { emoji: hit.person.emoji, title: hit.person.name };
    case "detail":
      return {
        emoji: hit.section.emoji || hit.person.emoji,
        title: hit.detail.title,
        context: `about ${hit.person.name}`,
      };
    case "scrap":
      return { emoji: "🧷", title: hit.scrap.text, context: `saved ${scrapAge(hit.scrap.createdAt, now)}` };
  }
}

/** 44px rounded tile: a real thumbnail when the hit has one, an emoji otherwise */
function HitVisual({ emoji, imageUrl }: { emoji: string; imageUrl?: string }) {
  const [errored, setErrored] = useState(false);
  if (imageUrl && !errored) {
    return (
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-cream-deep ring-1 ring-line/50">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="44px"
          className="object-cover"
          unoptimized={imageUrl.endsWith(".svg")}
          onError={() => setErrored(true)}
        />
      </span>
    );
  }
  return (
    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cream-deep text-[1.25rem] ring-1 ring-line/50">
      {emoji}
    </span>
  );
}

function HitRow({
  id,
  hit,
  active,
  now,
  onActivate,
  onHover,
}: {
  id: string;
  hit: LocalHit;
  active: boolean;
  now: Date;
  onActivate: () => void;
  onHover: () => void;
}) {
  const v = describeHit(hit, now);
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      // keep DOM focus in the input on pointer-select (true combobox behavior)
      onMouseDown={(e) => e.preventDefault()}
      onClick={onActivate}
      onMouseEnter={onHover}
      className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${
        active ? "bg-cream-deep" : "hover:bg-cream-deep/60"
      }`}
    >
      <HitVisual emoji={v.emoji} imageUrl={v.imageUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-semibold text-ink">{v.title}</p>
        {v.context && <p className="truncate text-[0.8rem] text-brown-soft">{v.context}</p>}
      </div>
    </div>
  );
}

/**
 * The Home search: a listbox-popup combobox over the user's whole little world.
 * The parent owns the query (so it can hide the list grid while searching); this
 * component owns the input, the debounced search, and the keyboard/ARIA wiring.
 */
export function GlobalSearch({ query, onQueryChange }: { query: string; onQueryChange: (q: string) => void }) {
  const { lists, people, scraps } = useStore();
  const { openPocketSheet } = useUi();
  const router = useRouter();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [now] = useState(() => new Date());

  const open = query.trim() !== "";

  // Debounce the query feeding the (pure) search so we don't rescan the whole
  // store on every keystroke.
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const groups = useMemo(
    () => searchLittleWorld(debounced, { lists, people, scraps }),
    [debounced, lists, people, scraps]
  );
  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups]);
  const ids = useMemo(() => flat.map(optionId), [flat]);

  // Emit once per settled (debounced) search, never the query text.
  useEffect(() => {
    if (debounced.trim() === "") return;
    trackProductEvent("search_completed", {
      resultCount: flat.length,
      zeroResult: flat.length === 0,
    });
  }, [debounced, flat.length]);

  const activate = (hit: LocalHit) => {
    switch (hit.kind) {
      case "list":
        router.push(`/app/list/${hit.list.id}`);
        break;
      case "item":
        router.push(`/app/list/${hit.list.id}`);
        break;
      case "person":
        router.push(`/app/person/${hit.person.id}`);
        break;
      case "detail":
        router.push(`/app/person/${hit.person.id}`);
        break;
      case "scrap":
        openPocketSheet();
        break;
    }
  };

  const nav = useComboboxNav({
    ids,
    onSelect: (_id, i) => activate(flat[i]),
    onEscape: () => onQueryChange(""),
  });

  // keep the active option visible as arrows walk past the scroll edge
  useEffect(() => {
    if (!nav.activeId) return;
    document.getElementById(nav.activeId)?.scrollIntoView({ block: "nearest" });
  }, [nav.activeId]);

  const showEmpty = open && groups.length === 0 && debounced.trim() !== "";

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 rounded-pill bg-paper px-4 py-3 shadow-soft ring-1 ring-line/60">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-brown-soft">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <label htmlFor="global-search-input" className="sr-only">
          Search your little world
        </label>
        <input
          id="global-search-input"
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={LISTBOX_ID}
          aria-activedescendant={open ? nav.activeId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={nav.onKeyDown}
          placeholder="Search your little world…"
          className={`w-full bg-transparent text-[1rem] text-ink placeholder:text-brown-soft/80 focus:outline-none ${focusRing}`}
        />
        {open && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-brown-soft transition-colors hover:bg-cream-deep hover:text-ink ${focusRing}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Search results"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            // The listbox is its own scroll container (independent of <main>'s pb-36), and its
            // max-height is viewport-relative while its top offset on the page isn't — so a
            // flat clearance has to cover the worst case (results starting further down the
            // page, e.g. with the first-steps checklist card showing). Reserve room for both
            // fixed bottom fixtures (FAB, then nav) so the last option's bottom edge always
            // lands above the FAB, not just the nav.
            className="mt-3 max-h-[60vh] overflow-y-auto rounded-2xl bg-paper p-2 pb-[calc(env(safe-area-inset-bottom)+16rem)] shadow-soft ring-1 ring-line/60"
          >
            {showEmpty ? (
              <p className="px-3 py-6 text-center text-[0.95rem] leading-relaxed text-brown">
                Nothing by that name yet. Maybe it&apos;s waiting to be saved ✨
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.key} role="group" aria-label={group.label} className="pb-1">
                  <div aria-hidden className="px-2 pb-1 pt-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
                    {group.label}
                  </div>
                  {group.hits.map((hit) => {
                    const id = optionId(hit);
                    return (
                      <HitRow
                        key={id}
                        id={id}
                        hit={hit}
                        active={nav.activeId === id}
                        now={now}
                        onActivate={() => activate(hit)}
                        onHover={() => nav.setActiveIndex(flat.indexOf(hit))}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

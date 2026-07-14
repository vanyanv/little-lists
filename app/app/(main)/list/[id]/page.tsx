"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useList, useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { listCountLabel, themeClass } from "@/lib/visual";
import { softSpring } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { STATUS_META, TEMPLATE_META, statusesForList, type List } from "@/lib/types";
import { EXAMPLE_TAG } from "@/lib/onboarding";
import { DetailHeader } from "@/components/detail-header";
import { ItemCard } from "@/components/item-card";
import { FilterChips, type FilterOption } from "@/components/filter-chips";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { EmptyState } from "@/components/empty-state";
import { OverflowMenu } from "@/components/overflow-menu";
import { Button } from "@/components/button";
import { PeopleTemplateNudge } from "@/components/people-template-nudge";
import { RevisitBeacon } from "@/components/revisit-beacon";
import { filterItemsByStatus } from "@/lib/store-helpers";
import { SortControl } from "@/components/sort-control";
import { sortItems, isSortMode, type SortMode } from "@/lib/sort";

// The drag engine (@dnd-kit, ~4 packages) is only used in custom-sort mode;
// load it lazily so ordinary list views don't pay for it.
const ListDnd = dynamic(() => import("@/components/list-dnd").then((m) => m.ListDnd), { ssr: false });
// The import sheet's matching stream is only needed once someone reaches for
// it; load it lazily like ListDnd rather than paying for it on every visit.
const ImportSheet = dynamic(() => import("@/components/import-sheet").then((m) => m.ImportSheet), { ssr: false });

/** the list's saved view, falling back to its template default */
function defaultViewFor(list?: Pick<List, "template" | "defaultView">): ViewMode {
  if (!list) return "cozy";
  return list.defaultView ?? TEMPLATE_META[list.template].defaultView;
}

/** the list's saved sort, falling back to recently-added */
function defaultSortFor(list?: Pick<List, "defaultSort">): SortMode {
  return list?.defaultSort && isSortMode(list.defaultSort) ? list.defaultSort : "recent";
}

export default function ListDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const list = useList(id);
  const { setListView, setListSort, reorderItems, deleteList, duplicateList } = useStore();
  const people = useStore().people;
  const { openItemSheet, openEditList, openConfirm, showToast } = useUi();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>(() => defaultViewFor(list));
  const [sort, setSort] = useState<SortMode>(() => defaultSortFor(list));
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const reduce = useReducedMotion();

  // change the view here AND remember it on the list for next time
  const changeView = (next: ViewMode) => {
    setView(next);
    if (list) setListView(list.id, next);
  };

  const changeSort = (next: SortMode) => {
    setSort(next);
    if (list) setListSort(list.id, next);
  };

  // The saved per-list view must win over the template default. Derive it once
  // per list id the first time the list is available; a ref keeps a later
  // in-session view change from being clobbered when the list object re-renders.
  const derivedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!list) return;
    if (derivedForRef.current === list.id) return;
    derivedForRef.current = list.id;
    setFilter("all");
    setTagFilter(null);
    setPersonFilter(null);
    setQuery("");
    setView(defaultViewFor(list));
    setSort(defaultSortFor(list));
  }, [list]);

  const options = useMemo<FilterOption[]>(() => {
    if (!list) return [];
    const base: FilterOption[] = [{ id: "all", label: "All", count: list.items.length }];
    for (const s of statusesForList(list)) {
      base.push({
        id: s,
        label: STATUS_META[s].label,
        count: list.items.filter((i) => i.status === s).length,
      });
    }
    return base;
  }, [list]);

  const tagOptions = useMemo(() => {
    if (!list) return [] as string[];
    const set = new Set<string>();
    for (const it of list.items) for (const t of it.tags ?? []) if (t !== EXAMPLE_TAG) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [list]);

  const personOptions = useMemo(() => {
    if (!list) return [] as { id: string; name: string }[];
    const ids = new Set<string>();
    for (const it of list.items) if (it.personId) ids.add(it.personId);
    return [...ids]
      .map((id) => ({ id, name: people.find((p) => p.id === id)?.name ?? "Someone" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [list, people]);

  const visible = useMemo(() => {
    if (!list) return [];
    let rows = filterItemsByStatus(list.items, filter);
    if (tagFilter) rows = rows.filter((i) => (i.tags ?? []).includes(tagFilter));
    if (personFilter) rows = rows.filter((i) => i.personId === personFilter);
    const q = query.trim().toLowerCase();
    if (q)
      rows = rows.filter(
        (i) => i.title.toLowerCase().includes(q) || (i.note ?? "").toLowerCase().includes(q)
      );
    return sortItems(rows, sort, statusesForList(list));
  }, [list, filter, tagFilter, personFilter, query, sort]);

  // Stable reference for ItemCard's `statuses` prop — statusesForList returns a
  // fresh array each call, which would defeat ItemCard's memo every render.
  // Called unconditionally (hooks rule); guards internally for the pre-load state.
  const statuses = useMemo(() => (list ? statusesForList(list) : []), [list]);

  const dragEnabled =
    !!list &&
    sort === "custom" &&
    filter === "all" &&
    !tagFilter &&
    !personFilter &&
    query.trim().length === 0;

  const listMenu = list ? (
    <OverflowMenu
      ariaLabel="List options"
      items={[
        { label: "Edit list", onSelect: () => openEditList(list.id) },
        { label: "Paste a list in", onSelect: () => setImportOpen(true) },
        {
          label: "Duplicate list",
          onSelect: () => {
            void duplicateList(list.id).then((created) => {
              if (created) {
                showToast("Copied your little list ✨");
                router.push(`/app/list/${created.id}`);
              } else {
                showToast("That didn't save. Let's try again 🌿");
              }
            });
          },
        },
        {
          label: "Delete list",
          tone: "danger",
          onSelect: () =>
            openConfirm({
              title: "Remove this little list?",
              body: "This will delete the list and everything inside it.",
              confirmLabel: "Delete list",
              tone: "danger",
              onConfirm: () => {
                const handle = deleteList(list.id);
                showToast("Removed from your little world", {
                  action: { label: "Undo", onAction: handle.undo },
                  onExpire: handle.commit,
                });
                router.replace("/app");
              },
            }),
        },
      ]}
    />
  ) : null;

  if (!list) {
    return (
      <div className="px-6 pt-32 text-center">
        <p className="font-display text-[1.4rem] font-semibold text-ink">We can&apos;t find that little world</p>
        <p className="mt-2 text-brown">It may have wandered off.</p>
        <Button href="/app" size="sm" className="mt-6">
          Back to your lists
        </Button>
      </div>
    );
  }

  const activeLabel = options.find((o) => o.id === filter)?.label ?? "this";
  const layoutClass =
    view === "grid"
      ? // browsing gets poster-wall density; custom (arranging) keeps two
        // columns so the grip handles and drag targets stay comfortable
        sort === "custom"
        ? "grid grid-cols-2 gap-x-3 gap-y-4"
        : "grid grid-cols-3 gap-x-2 gap-y-3.5"
      : view === "list"
        ? "flex flex-col gap-2.5"
        : "flex flex-col gap-3";

  // Long lists get gentler treatment: a search field to sift through them, and
  // (past ~40) we drop the per-item layout animation so reordering stays smooth.
  const showSearch = list.items.length > 30;
  const skipLayout = list.items.length > 40;
  const searching = query.trim().length > 0;
  // content-visibility lets the browser skip laying out off-screen rows; the
  // intrinsic-size hint keeps the scrollbar honest before they're rendered.
  const rowClass =
    view === "list"
      ? "[content-visibility:auto] [contain-intrinsic-size:auto_64px]"
      : view === "grid"
        ? // an expanded editor needs the whole row, not half a grid column
          "has-[[aria-expanded=true]]:col-span-full"
        : undefined;

  return (
    <div className={themeClass(list.theme)}>
      <RevisitBeacon key={list.id} event="list_revisited" />
      <DetailHeader
        emoji={list.emoji}
        title={list.title}
        subtitle={listCountLabel(list)}
        sticker={TEMPLATE_META[list.template].sticker}
        menu={listMenu}
        controls={
          list.items.length > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-end gap-2">
                {showSearch && (
                  <div className="relative flex-1">
                    <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brown-soft/70">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Find a little thing…"
                      aria-label="Find a little thing in this list"
                      className={`min-h-11 w-full rounded-pill border border-line bg-paper/90 pl-9 pr-10 text-[1rem] text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none ${focusRing}`}
                    />
                    {searching && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                        className={`absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-brown-soft transition-colors hover:bg-cream-deep hover:text-ink ${focusRing}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                <SortControl value={sort} onChange={changeSort} />
                <ViewToggle value={view} onChange={changeView} />
              </div>
              <FilterChips options={options} active={filter} onChange={setFilter} />
              {(tagOptions.length > 0 || personOptions.length > 0) && (
                <div className="no-scrollbar fade-x -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
                  {personOptions.map((p) => {
                    const active = personFilter === p.id;
                    return (
                      <button
                        key={`person-${p.id}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setPersonFilter(active ? null : p.id)}
                        className={`flex min-h-11 shrink-0 items-center gap-1 rounded-pill px-3.5 text-[0.8rem] font-bold transition ${focusRing} ${
                          active ? "bg-ink text-cream shadow-soft" : "bg-paper text-brown ring-1 ring-line/70"
                        }`}
                      >
                        <span aria-hidden>◍</span> {p.name}
                      </button>
                    );
                  })}
                  {tagOptions.map((t) => {
                    const active = tagFilter === t;
                    return (
                      <button
                        key={`tag-${t}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTagFilter(active ? null : t)}
                        className={`flex min-h-11 shrink-0 items-center gap-1 rounded-pill px-3.5 text-[0.8rem] font-bold transition ${focusRing} ${
                          active ? "bg-ink text-cream shadow-soft" : "bg-paper text-brown ring-1 ring-line/70"
                        }`}
                      >
                        <span aria-hidden>#</span> {t}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : null
        }
      />

      {/* grandfathered "People notes" lists: the template is retired from
          pickers, so steer toward the canonical People tab without touching
          anything about how this existing list works */}
      {list.template === "people" && (
        <div className="px-4">
          <PeopleTemplateNudge />
        </div>
      )}

      <div className="px-4 pt-3">
        {list.items.length === 0 ? (
          <EmptyState
            sticker={TEMPLATE_META[list.template].sticker}
            title="Nothing here yet"
            hint="Add the first little thing and watch your collection begin ✨"
            action={
              <div className="flex flex-col items-center gap-2">
                <Button size="sm" onClick={() => openItemSheet(list.id)}>
                  Add the first little thing
                </Button>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className={`rounded-pill text-[0.86rem] font-bold text-brown ${focusRing}`}
                >
                  or paste a whole list in ›
                </button>
              </div>
            }
          />
        ) : visible.length === 0 ? (
          searching ? (
            <EmptyState
              sticker="sparkle"
              title="No little things match"
              hint={`Nothing here matches “${query.trim()}”. Try another word.`}
              action={
                <Button size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              sticker="sparkle"
              title={`Nothing under ${activeLabel.toLowerCase()} yet`}
              hint="Peek at another filter, or add something new to this little world."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setFilter("all");
                    setTagFilter(null);
                    setPersonFilter(null);
                  }}
                >
                  Show everything
                </Button>
              }
            />
          )
        ) : dragEnabled ? (
          <ListDnd
            list={list}
            items={visible}
            view={view}
            layoutClass={layoutClass}
            onReorder={(orderedIds) => reorderItems(list.id, orderedIds)}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              className={layoutClass}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {visible.map((item, i) => (
                <motion.div
                  key={item.id}
                  className={rowClass}
                  layout={!skipLayout}
                  initial={reduce ? false : { opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={reduce ? softSpring : { ...softSpring, delay: Math.min(i, 8) * 0.04 }}
                >
                  <ItemCard listId={list.id} item={item} view={view} statuses={statuses} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {importOpen && (
        <ImportSheet list={list} open={importOpen} onClose={() => setImportOpen(false)} />
      )}
    </div>
  );
}

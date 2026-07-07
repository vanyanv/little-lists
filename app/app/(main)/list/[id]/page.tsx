"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useList, useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { listCountLabel, themeClass } from "@/lib/visual";
import { softSpring } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { STATUS_META, TEMPLATE_META, statusesForList, type List } from "@/lib/types";
import { DetailHeader } from "@/components/detail-header";
import { ItemCard } from "@/components/item-card";
import { FilterChips, type FilterOption } from "@/components/filter-chips";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { EmptyState } from "@/components/empty-state";
import { OverflowMenu } from "@/components/overflow-menu";
import { Button } from "@/components/button";
import { SoftDotLoader } from "@/components/soft-dot-loader";
import { filterItemsByStatus } from "@/lib/store-helpers";

/** the list's saved view, falling back to its template default */
function defaultViewFor(list?: Pick<List, "template" | "defaultView">): ViewMode {
  if (!list) return "cozy";
  return list.defaultView ?? TEMPLATE_META[list.template].defaultView;
}

export default function ListDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const list = useList(id);
  const { hydrated, setListView, deleteList } = useStore();
  const { openItemSheet, openEditList, openConfirm, showToast } = useUi();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<ViewMode>(() => defaultViewFor(list));
  const [query, setQuery] = useState("");
  const reduce = useReducedMotion();

  // change the view here AND remember it on the list for next time
  const changeView = (next: ViewMode) => {
    setView(next);
    if (list) setListView(list.id, next);
  };

  // The saved per-list view must win over the template default, but on a hard
  // refresh `view` is seeded before the client store has the list, so it can
  // land on "cozy". Re-derive it once — per list id — the first time the list is
  // actually available after hydration; a ref keeps a later in-session view
  // change from being clobbered when the list object re-renders.
  const derivedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !list) return;
    if (derivedForRef.current === list.id) return;
    derivedForRef.current = list.id;
    setFilter("all");
    setQuery("");
    setView(defaultViewFor(list));
  }, [hydrated, list]);

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

  const visible = useMemo(() => {
    if (!list) return [];
    const byStatus = filterItemsByStatus(list.items, filter);
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.note ?? "").toLowerCase().includes(q)
    );
  }, [list, filter, query]);

  const listMenu = list ? (
    <OverflowMenu
      ariaLabel="List options"
      items={[
        { label: "Edit list", onSelect: () => openEditList(list.id) },
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
                deleteList(list.id);
                showToast("Removed from your little world");
                router.replace("/app");
              },
            }),
        },
      ]}
    />
  ) : null;

  // saved lists load from localStorage after mount — wait for that before
  // deciding a list is truly missing, so a direct URL visit doesn't flash 404
  if (!list && !hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <SoftDotLoader label="opening this little world" />
      </div>
    );
  }

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
      ? "grid grid-cols-2 gap-x-3 gap-y-4"
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
  const rowClass = view === "list" ? "[content-visibility:auto] [contain-intrinsic-size:auto_64px]" : undefined;

  return (
    <div className={themeClass(list.theme)}>
      <DetailHeader
        emoji={list.emoji}
        title={list.title}
        subtitle={listCountLabel(list)}
        sticker={TEMPLATE_META[list.template].sticker}
        menu={listMenu}
      />

      {list.items.length > 0 && (
        <div
          className="sticky top-0 z-10 px-4 pt-3 pb-2 backdrop-blur-md"
          style={{
            // fade from the themed header wash into cream, so the sticky bar
            // hands off continuously instead of jumping to a flat panel
            background:
              "linear-gradient(to bottom, color-mix(in oklab, var(--t-bg) 88%, transparent), color-mix(in oklab, var(--color-cream) 88%, transparent))",
          }}
        >
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
                  className={`min-h-11 w-full rounded-pill border border-line bg-paper/90 pl-9 pr-10 text-[0.9rem] text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none ${focusRing}`}
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
            <ViewToggle value={view} onChange={changeView} />
          </div>
          <FilterChips options={options} active={filter} onChange={setFilter} />
        </div>
      )}

      <div className="px-4 pt-3">
        {list.items.length === 0 ? (
          <EmptyState
            sticker={TEMPLATE_META[list.template].sticker}
            title="Nothing here yet"
            hint="Add the first little thing and watch your collection begin ✨"
            action={
              <Button size="sm" onClick={() => openItemSheet(list.id)}>
                Add the first little thing
              </Button>
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
                <Button size="sm" onClick={() => setFilter("all")}>
                  Show everything
                </Button>
              }
            />
          )
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
                  <ItemCard listId={list.id} item={item} view={view} statuses={statusesForList(list)} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

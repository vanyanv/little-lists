"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useList, useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { listCountLabel, themeClass } from "@/lib/visual";
import { softSpring } from "@/lib/motion";
import { focusRing, focusRingOnDark } from "@/lib/a11y";
import { STATUS_META, TEMPLATE_META, statusesForList, type List } from "@/lib/types";
import { DetailHeader } from "@/components/detail-header";
import { ItemCard } from "@/components/item-card";
import { FilterChips, type FilterOption } from "@/components/filter-chips";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { EmptyState } from "@/components/empty-state";
import { OverflowMenu } from "@/components/overflow-menu";
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
  const reduce = useReducedMotion();

  // change the view here AND remember it on the list for next time
  const changeView = (next: ViewMode) => {
    setView(next);
    if (list) setListView(list.id, next);
  };

  // reset browsing state when moving to a different little world
  useEffect(() => {
    setFilter("all");
    setView(defaultViewFor(list));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    return filterItemsByStatus(list.items, filter);
  }, [list, filter]);

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
    return <div className="min-h-dvh" aria-hidden />;
  }

  if (!list) {
    return (
      <div className="px-6 pt-32 text-center">
        <p className="font-display text-[1.4rem] font-semibold text-ink">We can&apos;t find that little world</p>
        <p className="mt-2 text-brown">It may have wandered off.</p>
        <Link href="/app" className={`mt-6 inline-block rounded-pill bg-ink px-5 py-3 text-sm font-bold text-cream ${focusRingOnDark}`}>
          Back to your lists
        </Link>
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
        <div className="sticky top-0 z-10 bg-cream/85 px-4 pt-3 pb-2 backdrop-blur-md">
          <div className="mb-2 flex justify-end">
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
              <button
                type="button"
                onClick={() => openItemSheet(list.id)}
                className={`rounded-pill bg-ink px-5 py-3 text-[0.92rem] font-bold text-cream shadow-soft ${focusRingOnDark}`}
              >
                Add the first little thing
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            sticker="sparkle"
            title={`Nothing under ${activeLabel.toLowerCase()} yet`}
            hint="Peek at another filter, or add something new to this little world."
            action={
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-pill bg-ink px-5 py-3 text-[0.92rem] font-bold text-cream shadow-soft ${focusRingOnDark}`}
              >
                Show everything
              </button>
            }
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
                  layout
                  initial={reduce ? false : { opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={reduce ? softSpring : { ...softSpring, delay: Math.min(i, 8) * 0.04 }}
                >
                  <ItemCard listId={list.id} item={item} view={view} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useList } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { listCountLabel, themeClass } from "@/lib/visual";
import { softSpring } from "@/lib/motion";
import { STATUS_META, TEMPLATE_META, statusesForList, type List } from "@/lib/types";
import { DetailHeader } from "@/components/detail-header";
import { ItemCard } from "@/components/item-card";
import { FilterChips, type FilterOption } from "@/components/filter-chips";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { EmptyState } from "@/components/empty-state";

/** the list's saved view, falling back to its template default */
function defaultViewFor(list?: Pick<List, "template" | "defaultView">): ViewMode {
  if (!list) return "cozy";
  return list.defaultView ?? TEMPLATE_META[list.template].defaultView;
}

export default function ListDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const list = useList(id);
  const { openItemSheet } = useUi();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<ViewMode>(() => defaultViewFor(list));

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
    if (filter === "all") return list.items;
    return list.items.filter((i) => i.status === filter);
  }, [list, filter]);

  if (!list) {
    return (
      <div className="px-6 pt-32 text-center">
        <p className="font-display text-[1.4rem] font-semibold text-ink">We can&apos;t find that little world</p>
        <p className="mt-2 text-brown">It may have wandered off.</p>
        <Link href="/" className="mt-6 inline-block rounded-pill bg-ink px-5 py-3 text-sm font-bold text-cream">
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
      />

      {list.items.length > 0 && (
        <div className="sticky top-0 z-10 bg-cream/85 px-4 pt-3 pb-2 backdrop-blur-md">
          <div className="mb-2 flex justify-end">
            <ViewToggle value={view} onChange={setView} />
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
                className="rounded-pill bg-ink px-5 py-3 text-[0.92rem] font-bold text-cream shadow-soft"
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
                className="rounded-pill bg-ink px-5 py-3 text-[0.92rem] font-bold text-cream shadow-soft"
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
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ ...softSpring, delay: Math.min(i, 8) * 0.04 }}
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

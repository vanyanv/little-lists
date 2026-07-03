"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { ItemType } from "@/lib/types";
import { staggerContainer, riseItem } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { ListCard } from "@/components/list-card";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/button";

const CATEGORIES: { id: string; label: string; kinds: ItemType[] | null }[] = [
  { id: "all", label: "Everything", kinds: null },
  { id: "watch", label: "🎬 To watch", kinds: ["movie"] },
  { id: "read", label: "📚 To read", kinds: ["book"] },
  { id: "taste", label: "🍜 To taste", kinds: ["food", "place"] },
  { id: "things", label: "✨ Little things", kinds: ["custom"] },
];

export default function HomeScreen() {
  const { lists, profile } = useStore();
  const { openListSheet } = useUi();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const reduce = useReducedMotion();

  const hasLists = lists.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const kinds = CATEGORIES.find((c) => c.id === cat)?.kinds;
    return lists.filter((l) => {
      const matchesCat = !kinds || kinds.includes(l.kind);
      const matchesQuery = !q || l.title.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [lists, query, cat]);

  const [hero, ...rest] = filtered;

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      {/* greeting */}
      <header className="px-1">
        <p className="text-[0.92rem] font-bold text-brown">Hi {user?.firstName ?? profile.name} ✨</p>
        <h1 className="mt-1 font-display text-[2.3rem] font-semibold leading-none text-ink">
          Your little worlds
        </h1>
        <p className="mt-2 text-[0.95rem] text-brown">A tiny archive of your taste, plans, and people.</p>
      </header>

      {!hasLists ? (
        <EmptyState
          sticker="sparkle"
          title="No little worlds yet"
          hint="Start your first list and watch your tiny archive begin ✨"
          action={<Button onClick={openListSheet}>Start a little list</Button>}
        />
      ) : (
        <>
      {/* search pill */}
      <div className="mt-4 flex items-center gap-2 rounded-pill bg-paper px-4 py-3 shadow-soft ring-1 ring-line/60">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-brown-soft">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <label htmlFor="home-search" className="sr-only">Search your little worlds</label>
        <input
          id="home-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a little world…"
          className={`w-full bg-transparent text-[0.98rem] text-ink placeholder:text-brown-soft/80 focus:outline-none ${focusRing}`}
        />
      </div>

      {/* category chips */}
      <div className="no-scrollbar fade-x -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATEGORIES.map((c) => (
          <Chip key={c.id} variant="filter" active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {/* cards */}
      {filtered.length === 0 ? (
        <EmptyState
          sticker="sparkle"
          title="Nothing in this little corner yet"
          hint="Peek at another filter, or start a new little world."
          action={
            (query || cat !== "all") && (
              <Button
                size="sm"
                onClick={() => {
                  setQuery("");
                  setCat("all");
                }}
              >
                Show everything
              </Button>
            )
          }
        />
      ) : (
        <motion.div variants={staggerContainer} initial={reduce ? false : "hidden"} animate="show" className="mt-4 flex flex-col gap-3">
          {hero && (
            <motion.div variants={riseItem}>
              <ListCard list={hero} variant="hero" />
            </motion.div>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {rest.map((l) => (
                <motion.div key={l.id} variants={riseItem}>
                  <ListCard list={l} variant="normal" />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
        </>
      )}
    </div>
  );
}

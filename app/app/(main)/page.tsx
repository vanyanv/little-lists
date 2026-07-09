"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { type ItemType, type ListTemplate } from "@/lib/types";
import { ONBOARDING_TOAST_KEY } from "@/lib/onboarding";
import { staggerContainer, riseItem } from "@/lib/motion";
import { ListCard } from "@/components/list-card";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/button";
import { GettingStartedCard } from "@/components/getting-started-card";
import { GlobalSearch } from "@/components/global-search";
import { DemoBanner } from "@/components/demo-banner";
import { CategoryIcon } from "@/components/icons/category-icon";
import { LittleIcon } from "@/components/icons/little-icon";
import type { GlyphName } from "@/components/icons/glyphs";

const CATEGORIES: { id: string; label: string; glyph?: GlyphName; kinds: ItemType[] | null }[] = [
  { id: "all", label: "Everything", glyph: "sparkle", kinds: null },
  { id: "watch", label: "To watch", glyph: "film", kinds: ["movie"] },
  { id: "read", label: "To read", glyph: "book", kinds: ["book"] },
  { id: "hear", label: "To hear", glyph: "headphones", kinds: ["music"] },
  { id: "taste", label: "To taste", glyph: "ramen-bowl", kinds: ["food", "place"] },
  { id: "things", label: "Little things", glyph: "sparkle", kinds: ["custom"] },
];

/** quick ways into the create-list sheet from the fresh-start empty state */
const STARTER_CHIPS: { template: ListTemplate; label: string }[] = [
  { template: "movie", label: "Movie list" },
  { template: "book", label: "Book list" },
  { template: "food", label: "Food list" },
  { template: "gift", label: "Gift ideas" },
  { template: "date", label: "Date ideas" },
  { template: "custom", label: "Custom list" },
];

export default function HomeScreen() {
  const { lists, profile } = useStore();
  const { openListSheet, showToast } = useUi();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const reduce = useReducedMotion();

  // Prefer the Clerk first name, then a real display name; never greet with the
  // neutral "friend" placeholder — "there" is warmer than a stand-in identity.
  const realName = user?.firstName?.trim() || (profile.name !== "friend" ? profile.name : "");
  const greetingName = realName || "there";

  // onboarding sets this key just before its hard navigation here
  useEffect(() => {
    try {
      if (sessionStorage.getItem(ONBOARDING_TOAST_KEY)) {
        sessionStorage.removeItem(ONBOARDING_TOAST_KEY);
        showToast("Your first little worlds are ready ✨");
      }
    } catch {
      // storage unavailable — skip the welcome toast
    }
  }, [showToast]);

  const hasLists = lists.length > 0;

  // only offer type filters the user can actually match — a chip for a kind
  // they own no lists of is a guaranteed dead end
  const categories = useMemo(() => {
    const owned = new Set(lists.map((l) => l.kind));
    return CATEGORIES.filter((c) => !c.kinds || c.kinds.some((k) => owned.has(k)));
  }, [lists]);

  // a deleted list can strand the active chip; treat a vanished id as "all"
  const activeCat = categories.some((c) => c.id === cat) ? cat : "all";

  // A non-empty query hands the whole view to global search; a non-"Everything"
  // chip narrows the grid. Either way we drop the hero for a uniform grid so the
  // layout stops reshuffling.
  const searching = query.trim() !== "";
  const catFiltering = activeCat !== "all";

  const filtered = useMemo(() => {
    const kinds = CATEGORIES.find((c) => c.id === activeCat)?.kinds;
    const matched = lists.filter((l) => !kinds || kinds.includes(l.kind));
    // pinned worlds float to the top; a stable sort keeps the rest freshest-first
    return [...matched].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [lists, activeCat]);

  const [hero, ...rest] = filtered;

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      {/* greeting */}
      <header className="px-1">
        <p className="text-[0.92rem] font-bold text-brown">Hi {greetingName} ✨</p>
        <h1 className="mt-1 font-display text-[2.3rem] font-semibold leading-none text-ink">
          Your little worlds
        </h1>
        <p className="mt-2 text-[0.95rem] text-brown">A tiny archive of your taste, plans, and people.</p>
      </header>

      {!hasLists ? (
        <EmptyState
          sticker="sparkle"
          title="No little worlds yet"
          hint="Start with a movie list, a food opinion, a gift idea, or something totally yours."
          action={
            <div className="flex flex-col items-center gap-4">
              <Button onClick={() => openListSheet()}>Start a little list ✨</Button>
              <div className="flex max-w-[19rem] flex-wrap justify-center gap-2">
                {STARTER_CHIPS.map((c) => (
                  <Chip key={c.template} variant="filter" onClick={() => openListSheet(c.template)}>
                    <CategoryIcon id={c.template} size={14} />
                    {c.label}
                  </Chip>
                ))}
              </div>
            </div>
          }
        />
      ) : (
        <>
      <DemoBanner />
      <GettingStartedCard />

      {/* Search owns its own input; while a query is present it takes over the
          view and the category chips plus list grid step aside. */}
      <GlobalSearch query={query} onQueryChange={setQuery} />

      {!searching && (
        <>
          {/* category chips */}
          <div className="no-scrollbar fade-x -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {categories.map((c) => (
              <Chip
                key={c.id}
                variant="filter"
                active={activeCat === c.id}
                onClick={(e) => {
                  setCat(c.id);
                  e.currentTarget.scrollIntoView({
                    behavior: reduce ? "auto" : "smooth",
                    inline: "nearest",
                    block: "nearest",
                  });
                }}
              >
                {c.glyph && <LittleIcon name={c.glyph} size={14} />}
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
                catFiltering && (
                  <Button size="sm" onClick={() => setCat("all")}>
                    Show everything
                  </Button>
                )
              }
            />
          ) : catFiltering ? (
            <motion.div
              variants={staggerContainer}
              initial={reduce ? false : "hidden"}
              animate="show"
              className="mt-4 grid grid-cols-2 gap-3"
            >
              {filtered.map((l) => (
                <motion.div key={l.id} variants={riseItem}>
                  <ListCard list={l} variant="normal" />
                </motion.div>
              ))}
            </motion.div>
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
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { ITEM_TYPE_META } from "@/lib/types";
import { staggerContainer, riseItem } from "@/lib/motion";
import { ProfileHeader } from "@/components/profile-header";
import { ListCard } from "@/components/list-card";
import { PlaceholderPoster } from "@/components/placeholder-poster";

export default function ProfileScreen() {
  const { profile, lists } = useStore();

  const featured = useMemo(
    () => profile.featuredListIds.map((id) => lists.find((l) => l.id === id)).filter(Boolean),
    [profile.featuredListIds, lists]
  );

  const loved = useMemo(() => {
    const out: { listId: string; item: (typeof lists)[number]["items"][number] }[] = [];
    for (const l of lists) {
      for (const item of l.items) {
        if (item.status === "favorite" || item.status === "love") out.push({ listId: l.id, item });
      }
    }
    return out.slice(0, 10);
  }, [lists]);

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <p className="px-1 text-[0.92rem] font-bold text-brown">Your taste profile 🌙</p>
      <div className="mt-3">
        <ProfileHeader />
      </div>

      {/* things you love */}
      {loved.length > 0 && (
        <section className="mt-8">
          <h2 className="px-1 font-display text-[1.3rem] font-semibold text-ink">A few things you love</h2>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {loved.map(({ listId, item }) => {
              const isPoster = ITEM_TYPE_META[item.type].aspect !== "note";
              return (
                <Link key={item.id} href={`/list/${listId}`} className="w-[5.5rem] shrink-0">
                  {isPoster ? (
                    <PlaceholderPoster
                      seed={item.seed || item.title}
                      title={item.title}
                      badge="💗"
                      className="shadow-soft ring-1 ring-black/5"
                    />
                  ) : (
                    <div className="grid aspect-[2/3] place-items-center rounded-xl bg-cream-deep text-4xl shadow-soft ring-1 ring-line/60">
                      {item.emoji ?? "✨"}
                    </div>
                  )}
                  <p className="mt-1.5 line-clamp-2 text-center text-[0.76rem] font-semibold leading-tight text-ink">
                    {item.title}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* featured lists */}
      <section className="mt-8">
        <h2 className="px-1 font-display text-[1.3rem] font-semibold text-ink">Featured little worlds</h2>
        <p className="px-1 text-[0.88rem] text-brown">the ones that feel most like you.</p>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-3 grid grid-cols-2 gap-3"
        >
          {featured.map(
            (l) =>
              l && (
                <motion.div key={l.id} variants={riseItem}>
                  <ListCard list={l} variant="normal" />
                </motion.div>
              )
          )}
        </motion.div>
      </section>
    </div>
  );
}

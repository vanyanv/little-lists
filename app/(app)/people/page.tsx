"use client";

import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { staggerContainer, riseItem, tap } from "@/lib/motion";
import { PersonCard } from "@/components/person-card";
import { EmptyState } from "@/components/empty-state";

export default function PeopleScreen() {
  const { people } = useStore();
  const { openPersonSheet } = useUi();

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="px-1">
        <p className="text-[0.92rem] font-bold text-brown">Your people 🫶</p>
        <h1 className="mt-1 font-display text-[2.3rem] font-semibold leading-none text-ink">
          The little things
        </h1>
        <p className="mt-2 text-[0.95rem] text-brown">
          A cozy archive of what makes them, them. Just for you.
        </p>
      </header>

      {people.length === 0 ? (
        <EmptyState
          sticker="heart"
          title="No one here yet"
          hint="Add someone you love and start keeping the little things about them ✨"
          action={
            <motion.button
              type="button"
              whileTap={tap}
              onClick={openPersonSheet}
              className="rounded-pill bg-ink px-6 py-3.5 text-[0.95rem] font-bold text-cream shadow-lift"
            >
              Add someone to remember
            </motion.button>
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-5 flex flex-col gap-3"
        >
          {people.map((p) => (
            <motion.div key={p.id} variants={riseItem}>
              <PersonCard person={p} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

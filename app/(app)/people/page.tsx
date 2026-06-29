"use client";

import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { staggerContainer, riseItem } from "@/lib/motion";
import { PersonCard } from "@/components/person-card";

export default function PeopleScreen() {
  const { people } = useStore();

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
    </div>
  );
}

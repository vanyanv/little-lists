"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { Person } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { hover, softSpring, tap } from "@/lib/motion";

export function PersonCard({ person }: { person: Person }) {
  const chips = person.sections.filter((s) => s.entries.length > 0).slice(0, 5);

  return (
    <Link href={`/person/${person.id}`} className={`block ${themeClass(person.theme)}`}>
      <motion.div
        layout
        whileHover={hover}
        whileTap={tap}
        transition={softSpring}
        className="rounded-2xl p-4 shadow-soft ring-1 ring-black/[0.03]"
        style={{ background: "var(--t-bg)" }}
      >
        <div className="flex items-center gap-3.5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-paper text-2xl shadow-soft">
            {person.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[1.2rem] font-semibold leading-tight text-[var(--t-ink)]">
              {person.name}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[0.86rem] font-medium text-brown">{person.note}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((s) => (
            <span
              key={s.id}
              className="rounded-pill bg-paper/70 px-2.5 py-1 text-[0.72rem] font-semibold text-[var(--t-ink)]"
            >
              {s.emoji} {s.label}
            </span>
          ))}
        </div>
      </motion.div>
    </Link>
  );
}

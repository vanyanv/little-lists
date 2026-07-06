"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { ThemeColor } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { AnimatedCategoryIcon } from "@/components/icons/animated-category-icon";
import { riseItem } from "@/lib/motion";

/* Each card's id doubles as its CategoryIcon key, so every use case wears the
   same drawn glyph the real list template gets inside the app. */
type UseCase = { id: string; title: string; line: string; theme: ThemeColor; wide?: boolean };

const USE_CASES: UseCase[] = [
  { id: "movies", title: "Movies to watch", line: "That film everyone keeps recommending.", theme: "blush" },
  { id: "books", title: "Books to read", line: "Your someday-soon reading pile.", theme: "lavender" },
  { id: "foods-hate", title: "Foods you hate", line: "So you never order it twice.", theme: "clay" },
  { id: "restaurants", title: "Restaurants to try", line: "Spots to wander into next.", theme: "sky" },
  { id: "dates", title: "Date ideas", line: "Little plans worth looking forward to.", theme: "blush" },
  { id: "gifts", title: "Gift ideas", line: "Catch the perfect idea before you forget it.", theme: "sage" },
  { id: "obsessions", title: "Current obsessions", line: "Whatever you can't stop thinking about.", theme: "sky" },
  { id: "people", title: "Little things about people", line: "The details that make someone feel seen.", theme: "butter" },
  { id: "notes", title: "Something totally custom", line: "Your own little world, any shape you like.", theme: "sage", wide: true },
];

function UseCaseCard({ c }: { c: UseCase }) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  // one threshold drives both the card reveal and the glyph's character move
  const inView = useInView(ref, { once: true, amount: 0.35 });
  // bumping the key remounts the icon, replaying its move on hover/tap
  const [replay, setReplay] = useState(0);
  const wake = () => setReplay((n) => n + 1);

  return (
    <motion.div
      ref={ref}
      variants={reduce ? undefined : riseItem}
      initial={reduce ? false : "hidden"}
      animate={reduce || inView ? "show" : "hidden"}
      onHoverStart={reduce ? undefined : wake}
      onTap={reduce ? undefined : wake}
      className={`rounded-2xl ${themeClass(c.theme)} ${c.wide ? "sm:col-span-2" : ""}`}
    >
      <div
        className="flex h-full items-start gap-3.5 rounded-2xl p-5 shadow-soft ring-1 ring-line/30"
        style={{ background: "var(--t-bg)" }}
      >
        <AnimatedCategoryIcon key={replay} id={c.id} play={inView} size={48} variant="badge" />
        <div className="min-w-0">
          <h3 className="font-display text-[1.15rem] font-semibold leading-tight text-[var(--t-ink)]">
            {c.title}
          </h3>
          <p className="mt-1 text-[0.92rem] leading-snug text-[var(--t-ink)]/90">{c.line}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 px-5 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <h2 className="font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
            A little list for everything
          </h2>
          <p className="mx-auto mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-brown">
            Whatever you want to keep track of, there&rsquo;s a cozy little corner for it.
          </p>
        </header>

        <div className="mt-9 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {USE_CASES.map((c) => (
            <UseCaseCard key={c.title} c={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

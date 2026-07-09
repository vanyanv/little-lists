"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { ViewMode } from "@/lib/types";
import { ViewToggle } from "@/components/view-toggle";
import { nextViewMode } from "@/lib/visual";
import { softSpring, fadeSlide, inViewOnce } from "@/lib/motion";

/* One little movie list, rearranged live: the visitor (or an idle timer) flips
   between the app's three browsing views and the same posters morph between
   arrangements — proof, not description. First-party drawn art on purpose. */

const SAMPLE = [
  { poster: "/posters/past-lives.svg", title: "Past Lives", theme: "blush" },
  { poster: "/posters/paddington.svg", title: "Paddington", theme: "sage" },
  { poster: "/posters/spirited-away.svg", title: "Spirited Away", theme: "butter" },
  { poster: "/posters/lady-bird.svg", title: "Lady Bird", theme: "sky" },
] as const;

type Sample = (typeof SAMPLE)[number];

const TITLES: Record<ViewMode, string> = { grid: "Grid", list: "List", cozy: "Cozy" };

const LINES: Record<ViewMode, string> = {
  grid: "For covers, posters, and pretty browsing.",
  list: "For scrolling through a lot fast.",
  cozy: "For thoughts, opinions, and anything freeform.",
};

const CYCLE_MS = 3500;
// a manual pick holds the idle cycle long enough to actually look
const MANUAL_PAUSE_MS = 8000;

function DemoItem({ s, mode, reduce }: { s: Sample; mode: ViewMode; reduce: boolean }) {
  const spring = reduce ? { duration: 0 } : softSpring;
  return (
    <motion.div
      layout={!reduce}
      transition={spring}
      className={
        mode === "grid"
          ? "min-w-0"
          : "flex min-w-0 items-center gap-2.5 rounded-lg bg-cream/80 px-2.5 py-2 ring-1 ring-line/30"
      }
    >
      <motion.span
        layout={!reduce}
        transition={spring}
        className={`relative block shrink-0 overflow-hidden ${
          mode === "grid" ? "aspect-square w-full rounded-lg shadow-soft" : "h-9 w-9 self-start rounded-md"
        }`}
      >
        <Image src={s.poster} alt={s.title} fill sizes="150px" unoptimized className="object-cover" />
      </motion.span>
      {mode !== "grid" && (
        <motion.span
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.12 }}
          className="min-w-0 flex-1"
        >
          <span className="block truncate text-[0.82rem] font-semibold text-ink">{s.title}</span>
          {mode === "cozy" && (
            <span className="mt-1.5 block space-y-1">
              <span className="block h-1 w-full rounded-full bg-cream-deep" />
              <span className="block h-1 w-3/5 rounded-full bg-cream-deep" />
            </span>
          )}
        </motion.span>
      )}
      {mode === "list" && (
        <span
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: `var(--color-${s.theme})` }}
        />
      )}
    </motion.div>
  );
}

export function ViewModes() {
  const reduce = useReducedMotion() ?? false;
  const demoRef = useRef<HTMLDivElement>(null);
  const inView = useInView(demoRef, { amount: 0.45 });
  const [mode, setMode] = useState<ViewMode>("grid");
  const holdUntil = useRef(0);

  // idle cycle: same in-view gating as the hero phone (app-preview.tsx)
  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => {
      if (Date.now() < holdUntil.current) return;
      setMode((m) => nextViewMode(m));
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reduce, inView]);

  const pick = (m: ViewMode) => {
    holdUntil.current = Date.now() + MANUAL_PAUSE_MS;
    setMode(m);
  };

  return (
    <section className="px-5 py-12">
      <div className="mx-auto grid max-w-4xl items-center gap-9 md:grid-cols-2">
        {/* copy */}
        <div className="text-center md:text-left">
          <h2 className="font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
            See it your way
          </h2>
          <p className="mx-auto mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-brown md:mx-0">
            Every list can be browsed three ways. Pick whatever feels right for what&rsquo;s inside. Same little world, just rearranged.
          </p>
        </div>

        {/* the demo: one list, three arrangements, morphing live */}
        <motion.div
          ref={demoRef}
          variants={reduce ? undefined : fadeSlide}
          initial={reduce ? false : "hidden"}
          whileInView={reduce ? undefined : "show"}
          viewport={inViewOnce}
          className="mx-auto w-full max-w-sm"
        >
          <div
            role="group"
            aria-label="Demo of the three list views"
            className="rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-line/40"
          >
            <div className="flex justify-center">
              <ViewToggle value={mode} onChange={pick} />
            </div>
            <div className={`mt-4 ${mode === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}`}>
              {SAMPLE.map((s) => (
                <DemoItem key={s.title} s={s} mode={mode} reduce={reduce} />
              ))}
            </div>
            <motion.p
              key={mode}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-3.5 text-center text-[0.85rem] leading-snug text-ink-soft"
            >
              <span className="font-semibold text-ink">{TITLES[mode]}</span> &mdash; {LINES[mode]}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { focusRing, focusRingOnDark } from "@/lib/a11y";
import { Sticker } from "@/components/sticker";
import { AppPreview } from "./app-preview";

export function LandingHero() {
  const reduce = useReducedMotion();
  const rise = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <section className="relative overflow-hidden px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      {/* soft pastel wash behind the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-16 h-60 w-60 rounded-full bg-blush/40 blur-3xl" />
        <div className="absolute -right-24 top-10 h-64 w-64 rounded-full bg-sky/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-lavender/30 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-5xl items-center gap-10 py-6 md:grid-cols-2 md:gap-8 md:py-12">
        {/* copy */}
        <motion.div
          {...rise}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center md:text-left"
        >
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-paper px-3 py-1 text-[0.8rem] font-bold text-brown shadow-soft ring-1 ring-line/60">
            <Sticker name="flower" size={16} /> Little Lists
          </span>

          <h1 className="mt-5 font-display font-semibold leading-[1.06] text-ink" style={{ fontSize: "clamp(2.05rem, 7.5vw, 3.4rem)" }}>
            Make little lists for everything you love, hate, and want to remember.
          </h1>

          <p className="mx-auto mt-4 max-w-[34rem] text-balance text-[1.02rem] leading-relaxed text-brown md:mx-0">
            Movies to watch, books to read, foods you avoid, gift ideas, date ideas, and tiny details about people, all in one cozy place.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link
              href="/sign-up"
              className={`inline-flex items-center justify-center rounded-pill bg-ink px-7 py-4 text-[1rem] font-bold text-cream shadow-lift transition-colors hover:bg-ink-soft ${focusRingOnDark}`}
            >
              Start your little world
            </Link>
            <Link
              href="#use-cases"
              className={`inline-flex items-center justify-center rounded-pill bg-paper px-7 py-4 text-[1rem] font-bold text-brown ring-1 ring-line transition-colors hover:bg-cream-deep ${focusRing}`}
            >
              See how it works
            </Link>
          </div>
        </motion.div>

        {/* phone preview */}
        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 24, rotate: -1.5 }, animate: { opacity: 1, y: 0, rotate: 0 } })}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.12 }}
          className="px-2"
        >
          <AppPreview />
        </motion.div>
      </div>
    </section>
  );
}

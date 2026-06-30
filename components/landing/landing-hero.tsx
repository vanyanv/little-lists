"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { softSpring, tap } from "@/lib/motion";
import { focusRing, focusRingOnDark } from "@/lib/a11y";
import { AppPreview } from "./app-preview";

// Animate the CTAs as the app animates every tappable surface: a soft press.
const MotionLink = motion.create(Link);

/* A soft rounded check in the sage accent, for the reassurance line. */
function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-sage">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.35" />
      <path d="M8 12.4l2.6 2.6L16 9.4" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
    </svg>
  );
}

export function LandingHero() {
  const reduce = useReducedMotion();
  const rise = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <section className="relative overflow-hidden px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      {/* two soft, deliberately placed warm glows — ambient wash, not stray ovals.
          one cradles the headline, one sits behind the phone preview. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-28 h-[28rem] w-[28rem] rounded-full bg-blush/30 blur-[120px]" />
        <div className="absolute -right-32 top-0 h-[32rem] w-[32rem] rounded-full bg-sky/25 blur-[130px]" />
      </div>

      <div className="relative mx-auto grid max-w-5xl items-center gap-9 py-8 md:grid-cols-2 md:gap-10 md:py-16">
        {/* copy */}
        <motion.div
          {...rise}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center md:text-left"
        >
          <h1 className="font-display font-semibold leading-[1.06] text-ink" style={{ fontSize: "clamp(2.05rem, 7.5vw, 3.4rem)" }}>
            Make little lists for everything you love, hate, and want to remember.
          </h1>

          <p className="mx-auto mt-4 max-w-[34rem] text-balance text-[1.02rem] leading-relaxed text-brown md:mx-0">
            Movies to watch, books to read, foods you avoid, gift ideas, date ideas, and tiny details about people, all in one cozy place.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <MotionLink
              href="/sign-up"
              whileTap={reduce ? undefined : tap}
              transition={softSpring}
              className={`inline-flex items-center justify-center rounded-pill bg-ink px-7 py-4 text-[1rem] font-bold text-cream shadow-lift transition-colors hover:bg-ink-soft ${focusRingOnDark}`}
            >
              Start your little world
            </MotionLink>
            <MotionLink
              href="#use-cases"
              whileTap={reduce ? undefined : tap}
              transition={softSpring}
              className={`inline-flex items-center justify-center rounded-pill bg-paper px-7 py-4 text-[1rem] font-bold text-brown ring-1 ring-line transition-colors hover:bg-cream-deep ${focusRing}`}
            >
              See how it works
            </MotionLink>
          </div>

          {/* honest, understated reassurance — no invented stats */}
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[0.85rem] font-semibold text-ink-soft md:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <CheckMark /> Free to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckMark /> Private by default
            </span>
          </p>
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

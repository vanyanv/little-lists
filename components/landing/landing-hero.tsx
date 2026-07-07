"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { softSpring, gentleSpring, tap, gentleFloat } from "@/lib/motion";
import { focusRing, focusRingOnDark } from "@/lib/a11y";
import { LittleIcon } from "@/components/icons/little-icon";
import type { GlyphName } from "@/components/icons/glyphs";
import type { List } from "@/lib/types";
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

/* The cozy sticker cluster around the phone: five die-cut glyphs scattered
   like stickers half-peeled off the scrapbook page. Anchored to the preview
   wrapper (never the copy column) so they can't collide with text at any
   width. Each settles in with a stagger, then drifts almost imperceptibly. */
const CLUSTER: {
  name: GlyphName;
  className: string;
  size: number;
  rotate: number;
  delay: number;
}[] = [
  { name: "clapperboard", className: "-left-2 top-6 sm:-left-5", size: 34, rotate: -12, delay: 0.35 },
  { name: "book", className: "-right-1 top-16 sm:-right-4", size: 32, rotate: 10, delay: 0.45 },
  { name: "tulip", className: "-left-1 bottom-24 sm:-left-4", size: 30, rotate: 8, delay: 0.55 },
  { name: "gift", className: "-right-2 bottom-10 sm:-right-5", size: 34, rotate: -9, delay: 0.5 },
  { name: "sparkle", className: "right-6 -top-3", size: 26, rotate: 14, delay: 0.65 },
];

function HeroStickers({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {CLUSTER.map((s, i) => (
        <motion.span
          key={s.name}
          className={`absolute ${s.className}`}
          initial={reduce ? false : { opacity: 0, scale: 0.6, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1, y: 0 }}
          transition={{ ...gentleSpring, delay: s.delay }}
        >
          <motion.span
            className="inline-flex"
            animate={reduce ? undefined : gentleFloat(i * 0.9)}
          >
            <LittleIcon name={s.name} variant="sticker" size={s.size} rotate={s.rotate} />
          </motion.span>
        </motion.span>
      ))}
    </div>
  );
}

export function LandingHero({ movies, books }: { movies?: List; books?: List }) {
  const reduce = useReducedMotion() ?? false;
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

      {/* items-start on md: the five-card phone runs tall, so the copy anchors
          to the top of the fold instead of drifting to the phone's midpoint */}
      <div className="relative mx-auto grid max-w-5xl items-center gap-9 py-8 md:grid-cols-2 md:items-start md:gap-10 md:py-16">
        {/* copy */}
        <motion.div
          {...rise}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 text-center md:pt-10 md:text-left"
        >
          <h1 className="font-display font-semibold leading-[1.06] text-ink" style={{ fontSize: "clamp(1.85rem, 7.5vw, 3.4rem)" }}>
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
              See what you can make
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

        {/* phone preview, with the sticker cluster scattered around it */}
        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 24, rotate: -1.5 }, animate: { opacity: 1, y: 0, rotate: 0 } })}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.12 }}
          className="min-w-0 px-2"
        >
          <div className="relative mx-auto w-full max-w-[300px]">
            <HeroStickers reduce={reduce} />
            <AppPreview movies={movies} books={books} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

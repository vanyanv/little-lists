"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { softSpring, gentleSpring, tap } from "@/lib/motion";
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

/* The cozy sticker trio around the phone: three die-cut glyphs placed like
   stickers half-peeled off the scrapbook page. Anchored to the preview
   wrapper (never the copy column) so they can't collide with text at any
   width. Each settles in with a stagger, then holds still — the entrance IS
   the moment; nothing loops. */
const CLUSTER: {
  name: GlyphName;
  className: string;
  size: number;
  rotate: number;
  delay: number;
}[] = [
  { name: "clapperboard", className: "-left-2 top-6 sm:-left-5", size: 34, rotate: -12, delay: 0.35 },
  { name: "book", className: "-right-1 top-20 sm:-right-4", size: 32, rotate: 10, delay: 0.45 },
  { name: "gift", className: "-left-1 bottom-24 sm:-left-4", size: 34, rotate: -9, delay: 0.5 },
];

function HeroStickers({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {CLUSTER.map((s) => (
        <motion.span
          key={s.name}
          className={`absolute ${s.className}`}
          initial={reduce ? false : { opacity: 0, scale: 0.6, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1, y: 0 }}
          transition={{ ...gentleSpring, delay: s.delay }}
        >
          <LittleIcon name={s.name} variant="sticker" size={s.size} rotate={s.rotate} />
        </motion.span>
      ))}
    </div>
  );
}

/* The hero's single material cue: a strip of translucent washi tape pressed
   over the phone's top bezel, as if the device were taped into the scrapbook.
   Same sky tint as the tape glyph; multiply blend so it reads as film over
   both the cream page and the dark frame. It presses on just after the phone
   lands. Position comes from left + margin (not transform) because motion
   owns this element's transform. */
function TapeStrip({ reduce }: { reduce: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute -top-3 left-1/2 z-20 ml-[-3rem] block h-7 w-28 mix-blend-multiply"
      initial={reduce ? false : { opacity: 0, scale: 1.25 }}
      animate={reduce ? undefined : { opacity: 1, scale: 1 }}
      transition={{ ...gentleSpring, delay: 0.55 }}
    >
      <span
        className="block h-full w-full -rotate-3 bg-sky/70"
        style={{ clipPath: "polygon(1.5% 0%, 100% 5%, 98.5% 100%, 0% 93%)" }}
      />
    </motion.span>
  );
}

export function LandingHero({ movies, books }: { movies?: List; books?: List }) {
  const reduce = useReducedMotion() ?? false;
  const [previewScreen, setPreviewScreen] = useState<"home" | "movies">("home");
  const rise = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <section className="relative overflow-hidden px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      {/* single column through tablet portrait; the side-by-side split waits
          for lg, where the headline and both CTA labels have real room */}
      <div className="relative mx-auto grid max-w-5xl items-center gap-8 pt-6 pb-2 sm:pt-8 sm:pb-4 lg:grid-cols-2 lg:items-start lg:gap-10 lg:py-16">
        {/* copy */}
        <motion.div
          {...rise}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 text-center lg:pt-10 lg:text-left"
        >
          <h1 className="text-balance font-display font-semibold leading-[1.06] text-ink" style={{ fontSize: "clamp(1.85rem, 7.5vw, 3.1rem)" }}>
            Remember what you love. Remember what they love.
          </h1>

          <p className="mx-auto mt-4 max-w-[34rem] text-balance text-[1.02rem] leading-relaxed text-brown lg:mx-0">
            Keep movies, books, places, gift ideas, plans, and the little details about your favorite people in one cozy, private place.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <MotionLink
              href="/sign-up"
              whileTap={reduce ? undefined : tap}
              transition={softSpring}
              className={`inline-flex items-center justify-center rounded-pill bg-ink px-7 py-4 text-[1rem] font-bold text-cream shadow-lift transition-colors hover:bg-ink-soft ${focusRingOnDark}`}
            >
              Start your first list
            </MotionLink>
            <MotionLink
              href="#how-it-works"
              whileTap={reduce ? undefined : tap}
              transition={softSpring}
              className={`inline-flex items-center justify-center rounded-pill bg-paper px-7 py-4 text-[1rem] font-bold text-brown ring-1 ring-line transition-colors hover:bg-cream-deep ${focusRing}`}
            >
              See how it works
            </MotionLink>
          </div>

          {/* honest, understated reassurance — no invented stats */}
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[0.85rem] font-semibold text-ink-soft lg:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <CheckMark /> Free to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckMark /> Private by default
            </span>
          </p>
        </motion.div>

        {/* phone preview, taped onto the page with the sticker trio around it.
            Below lg the phone is deliberately cropped: enough screen to show
            real lists (movies, a person's little things), then a soft dissolve
            into the paper so the next section arrives sooner. */}
        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 24, rotate: -1.5 }, animate: { opacity: 1, y: 0, rotate: 0 } })}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.12 }}
          className="min-w-0"
        >
          <div className="relative mx-auto w-full max-w-[300px]">
            <HeroStickers reduce={reduce} />
            <TapeStrip reduce={reduce} />
            <AnimatePresence>
              {previewScreen === "home" && (
                <motion.div
                  key="maya-note"
                  aria-hidden
                  initial={reduce ? false : { opacity: 0, x: 10, rotate: 2 }}
                  animate={{ opacity: 1, x: 0, rotate: -2 }}
                  exit={
                    reduce
                      ? undefined
                      : {
                          opacity: 0,
                          x: 8,
                          rotate: 1,
                          transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
                        }
                  }
                  transition={{
                    duration: reduce ? 0 : 0.5,
                    ease: [0.23, 1, 0.32, 1],
                    delay: reduce ? 0 : 0.7,
                  }}
                  className="absolute -right-4 top-36 z-30 hidden max-w-[9.5rem] rounded-lg bg-paper px-3 py-2 text-left shadow-lift ring-1 ring-line/50 sm:block lg:-right-20"
                >
                  <p className="text-[0.68rem] font-bold text-brown-soft">Maya said</p>
                  <p className="mt-0.5 font-display text-[0.82rem] font-semibold leading-tight text-ink">
                    “You would love Past Lives.”
                  </p>
                  <p className="mt-1 text-[0.66rem] font-bold text-rosewood">saved with Maya ♥</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="max-h-[27rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-3.5rem),transparent)] sm:max-h-[29rem] md:max-h-[30rem] lg:max-h-none lg:[mask-image:none]">
              <AppPreview movies={movies} books={books} onScreenChange={setPreviewScreen} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

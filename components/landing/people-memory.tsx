"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { PREVIEW_PERSON } from "@/lib/landing-data";
import { themeClass } from "@/lib/visual";
import { Sticker } from "@/components/sticker";
import { AnimatedCategoryIcon } from "@/components/icons/animated-category-icon";
import { CategoryIcon } from "@/components/icons/category-icon";
import { LittleIcon } from "@/components/icons/little-icon";
import { WHOLE_MOTION } from "@/components/icons/glyph-motion";

const NOTE_LAYOUT = [
  "-rotate-[1.2deg] bg-paper/90 md:col-span-2",
  "rotate-[0.8deg] bg-lavender/25",
  "-rotate-[0.6deg] bg-clay/20",
  "rotate-[1deg] bg-paper/90",
  "-rotate-[0.8deg] bg-blush/25",
] as const;

const NOTE_CONTEXT = [
  "movie-night favorite",
  "rainy-day comfort",
  "always a good idea",
  "skip it when ordering",
  "a little plan together",
] as const;

export function PeopleMemory() {
  const reduce = useReducedMotion() ?? false;
  const pageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(pageRef, { once: true, amount: 0.4 });
  const details = PREVIEW_PERSON.sections;

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-20 overflow-hidden border-y border-line/35 bg-butter/15 px-5 py-20 sm:py-24"
    >
      <Sticker
        name="heart"
        size={96}
        rotate={-12}
        className="pointer-events-none absolute -left-7 top-16 opacity-[0.12]"
      />
      <Sticker
        name="flower"
        size={112}
        rotate={10}
        className="pointer-events-none absolute -bottom-8 -right-7 opacity-[0.1]"
      />

      <div className="relative mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-butter/55 px-3 py-1 text-[0.8rem] font-bold text-ink ring-1 ring-line/40">
            <Sticker name="heart" size={15} /> People notes
          </span>
          <h2
            className="mt-5 font-display font-semibold leading-[1.04] text-ink"
            style={{ fontSize: "clamp(2rem, 6.6vw, 3.25rem)" }}
          >
            Your lists remember the people in them
          </h2>
          <p className="mx-auto mt-4 max-w-[34rem] text-[1.02rem] leading-relaxed text-brown lg:mx-0">
            Keep someone&rsquo;s favorites, recommendations, gift ideas, and plans together. The little
            things stay close until the moment they matter.
          </p>

          <div className="mx-auto mt-7 flex max-w-sm items-center justify-center gap-3 lg:mx-0 lg:justify-start">
            <span className="h-px flex-1 bg-line" aria-hidden />
            <p className="text-[0.78rem] font-bold text-brown-soft">not a contacts app, a care archive</p>
            <span className="h-px flex-1 bg-line" aria-hidden />
          </div>
        </div>

        <div
          ref={pageRef}
          className={`relative mx-auto w-full max-w-2xl rounded-[var(--radius-2xl)] ${themeClass(PREVIEW_PERSON.theme)}`}
        >
          <motion.div
            initial={false}
            animate={inView && !reduce ? { rotate: [0.5, -0.35, 0] } : undefined}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-paper p-5 shadow-lift ring-1 ring-line/50 sm:p-7"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-28 bg-butter/30 [clip-path:polygon(0_0,100%_0,100%_72%,0_100%)]"
            />
            <motion.span
              className="pointer-events-none absolute -right-3 -top-3 inline-flex"
              initial={false}
              animate={inView && !reduce ? WHOLE_MOTION.flower : undefined}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
            >
              <Sticker name="flower" size={72} rotate={-12} className="opacity-25" />
            </motion.span>

            <div className="relative flex items-center gap-4">
              <AnimatedCategoryIcon id="people" variant="badge" size={78} play={inView} />
              <div className="min-w-0">
                <p className="text-[0.72rem] font-bold text-brown-soft">YOUR PERSON</p>
                <h3 className="font-display text-[1.8rem] font-semibold leading-none text-[var(--t-ink)] sm:text-[2.15rem]">
                  Maya&rsquo;s little things
                </h3>
                <p className="mt-1 text-[0.9rem] font-semibold text-[var(--t-ink)]/75">
                  someone you love to plan little things for
                </p>
              </div>
            </div>

            <ul className="relative mt-7 grid gap-2.5 sm:grid-cols-2">
              {details.map((detail, index) => {
                const baseRotate = [-1.2, 0.8, -0.6, 1, -0.8][index];
                return (
                  <motion.li
                    key={detail.id}
                    initial={false}
                    animate={
                      inView && !reduce
                        ? {
                            y: [0, -5, 0],
                            rotate: [baseRotate, 0, baseRotate],
                            scale: [1, 1.018, 1],
                          }
                        : undefined
                    }
                    transition={{
                      duration: 0.48,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.18 + index * 0.09,
                    }}
                    whileHover={reduce ? undefined : { y: -3, rotate: 0, scale: 1.015 }}
                    className={`relative min-h-[4.5rem] rounded-xl p-3.5 shadow-soft ring-1 ring-line/45 ${NOTE_LAYOUT[index]}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cream/75 ring-1 ring-line/40">
                        <CategoryIcon id={detail.id} size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-[1rem] font-semibold leading-tight text-[var(--t-ink)]">
                          {detail.label}
                        </p>
                        <p className="mt-1 text-[0.7rem] font-bold text-[var(--t-ink)]/55">
                          {NOTE_CONTEXT[index]}
                        </p>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-line/60 pt-4">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-blush/25 px-3 py-2 text-[0.76rem] font-bold text-rosewood ring-1 ring-line/40">
                <LittleIcon name="clapperboard" size={14} /> Movies together
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-sage/25 px-3 py-2 text-[0.76rem] font-bold text-ink ring-1 ring-line/40">
                <LittleIcon name="gift" size={14} /> Gift ideas
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-sky/25 px-3 py-2 text-[0.76rem] font-bold text-ink ring-1 ring-line/40">
                <LittleIcon name="tulip" size={14} /> Plans together
              </span>
              <motion.span
                aria-hidden
                initial={false}
                animate={inView && !reduce ? { opacity: [0.45, 1, 0.65], rotate: [0, 12, 0] } : undefined}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
                className="ml-auto inline-flex"
              >
                <LittleIcon name="sparkle" variant="sticker" size={26} />
              </motion.span>
            </div>
          </motion.div>

          <motion.div
            aria-hidden
            initial={false}
            animate={inView && !reduce ? { opacity: [0, 1], y: [8, 0], rotate: [3, -2] } : undefined}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.65 }}
            className="absolute -bottom-4 -right-2 rounded-lg bg-ink px-3 py-2 text-[0.72rem] font-bold text-cream shadow-lift sm:-right-5"
          >
            remembered with care ♥
          </motion.div>
        </div>
      </div>
    </section>
  );
}

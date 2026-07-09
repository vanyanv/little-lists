"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
import type { List, ThemeColor } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { Cover } from "@/components/cover";
import { AnimatedCategoryIcon } from "@/components/icons/animated-category-icon";
import { LittleIcon } from "@/components/icons/little-icon";
import {
  SHOWCASE_MOVIES,
  SHOWCASE_BOOKS,
  SHOWCASE_PEOPLE_SCRAPS,
  SHOWCASE_GIFT_SCRAPS,
} from "@/lib/landing-data";
import { fadeSlide, gentleFloat, inViewOnce, popItem, posterFan, riseItem, shelfSlide } from "@/lib/motion";

/* An editorial scrapbook spread instead of a feature grid: DOM order is the
   mobile story (movies → people → books → gifts → scraps), and md:order-*
   reflows the same cards into an asymmetric 6-column layout. */

const stagger = (step: number, delay = 0.1): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** one threshold per card drives its reveal, its glyph move, and its previews */
function useCardReveal() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  // bumping the key remounts the icon, replaying its move on hover/tap
  const [replay, setReplay] = useState(0);
  const wake = () => setReplay((n) => n + 1);
  return { reduce, ref, inView, replay, wake };
}

type Reveal = ReturnType<typeof useCardReveal>;

function CardShell({
  theme,
  reveal,
  className = "",
  innerClassName = "p-5",
  radius = "rounded-2xl",
  frame = "ring-1 ring-line/30",
  children,
}: {
  theme: ThemeColor;
  reveal: Reveal;
  className?: string;
  innerClassName?: string;
  radius?: string;
  frame?: string;
  children: ReactNode;
}) {
  const { reduce, ref, inView, wake } = reveal;
  return (
    <motion.div
      ref={ref as RefObject<HTMLDivElement>}
      variants={reduce ? undefined : riseItem}
      initial={reduce ? false : "hidden"}
      animate={reduce || inView ? "show" : "hidden"}
      onHoverStart={reduce ? undefined : wake}
      onTap={reduce ? undefined : wake}
      className={`${radius} ${themeClass(theme)} ${className}`}
    >
      <div
        className={`h-full ${radius} shadow-soft ${frame} ${innerClassName}`}
        style={{ background: "var(--t-bg)" }}
      >
        {children}
      </div>
    </motion.div>
  );
}

function CardCopy({ title, line, big = false }: { title: string; line: string; big?: boolean }) {
  return (
    <div className="min-w-0">
      <h3
        className={`font-display font-semibold leading-tight text-[var(--t-ink)] ${big ? "text-[1.3rem]" : "text-[1.15rem]"}`}
      >
        {title}
      </h3>
      <p className="mt-1 text-[0.92rem] leading-snug text-[var(--t-ink)]/90">{line}</p>
    </div>
  );
}

/* ————— movies: a little collection of real posters ————— */

const POSTER_TILTS = [-6, 3, -2, 5];

function MoviesCard({ list, className }: { list: List; className?: string }) {
  const reveal = useCardReveal();
  const { reduce, inView, replay } = reveal;
  return (
    <CardShell theme="blush" reveal={reveal} className={className} innerClassName="flex flex-col p-6">
      <div className="flex items-start gap-3.5">
        <AnimatedCategoryIcon key={replay} id="movies" play={inView} size={52} variant="badge" />
        <CardCopy big title="Movies to watch" line="Type a title. Little Lists finds the poster for you." />
      </div>
      <motion.div
        variants={reduce ? undefined : stagger(0.1, 0.15)}
        initial={reduce ? false : "hidden"}
        animate={reduce || inView ? "show" : "hidden"}
        className="flex flex-1 items-center justify-center py-6 md:py-4"
      >
        {list.items.slice(0, 4).map((item, i) => (
          <motion.div
            key={item.id}
            custom={POSTER_TILTS[i]}
            variants={reduce ? undefined : posterFan}
            whileHover={reduce ? undefined : { y: -6, rotate: POSTER_TILTS[i] * 1.6, scale: 1.04, zIndex: 5 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className={`relative w-[88px] shrink-0 sm:w-[104px] md:w-[126px] ${i > 0 ? "-ml-4 sm:-ml-5" : ""} ${i === 3 ? "hidden sm:block" : ""}`}
            style={{ zIndex: i, rotate: reduce ? POSTER_TILTS[i] : undefined }}
          >
            <Cover item={item} rounded="rounded-xl" sizes="118px" className="shadow-soft" />
          </motion.div>
        ))}
      </motion.div>
    </CardShell>
  );
}

/* ————— books: a tiny shelf ————— */

function BooksCard({ list, className }: { list: List; className?: string }) {
  const reveal = useCardReveal();
  const { reduce, inView, replay } = reveal;
  return (
    <CardShell theme="lavender" reveal={reveal} className={className}>
      <div className="flex items-start gap-3.5">
        <AnimatedCategoryIcon key={replay} id="books" play={inView} size={48} variant="badge" />
        <CardCopy title="Books to read" line="Build a tiny shelf for your someday-soon reads." />
      </div>
      <div className="mt-5">
        <motion.div
          variants={reduce ? undefined : stagger(0.12)}
          initial={reduce ? false : "hidden"}
          animate={reduce || inView ? "show" : "hidden"}
          className="flex items-end justify-center gap-1.5"
        >
          {list.items.slice(0, 3).map((item, i) => (
            <motion.div
              key={item.id}
              variants={reduce ? undefined : shelfSlide}
              className="relative w-16 shrink-0 md:w-[72px]"
            >
              {i === 1 && (
                <span
                  aria-hidden
                  className="absolute -top-1.5 left-2.5 z-10 h-[22px] w-2.5 rounded-b-sm bg-clay/80"
                />
              )}
              <Cover item={item} rounded="rounded-md" sizes="72px" className="shadow-soft" />
            </motion.div>
          ))}
        </motion.div>
        <div aria-hidden className="mx-auto mt-1.5 h-1.5 w-[86%] rounded-full bg-[var(--t-ink)]/15" />
      </div>
    </CardShell>
  );
}

/* ————— people: jotted note-scraps, a teaser for the deeper section below ————— */

const NOTE_TILTS = ["-rotate-1", "rotate-[0.75deg]", "rotate-1", "-rotate-[0.75deg]"];

// the sparkle lands as the last stagger child, so it always follows the notes
const sparklePop: Variants = {
  hidden: { opacity: 0, scale: 0 },
  show: { opacity: 1, scale: [0, 1.2, 1], transition: { duration: 0.45, ease: "easeOut" } },
};

function PeopleCard({ className }: { className?: string }) {
  const reveal = useCardReveal();
  const { reduce, inView, replay } = reveal;
  return (
    <CardShell theme="butter" reveal={reveal} className={className} innerClassName="p-6">
      <div className="flex items-start gap-3.5">
        <AnimatedCategoryIcon key={replay} id="people" play={inView} size={52} variant="badge" />
        <CardCopy big title="Remember the little things" line="Save the details people mention once, but you’ll want later." />
      </div>
      <motion.div
        variants={reduce ? undefined : stagger(0.09)}
        initial={reduce ? false : "hidden"}
        animate={reduce || inView ? "show" : "hidden"}
        className="mt-5 flex flex-wrap items-center gap-2.5"
      >
        {SHOWCASE_PEOPLE_SCRAPS.map((note, i) => (
          <motion.span
            key={note}
            variants={reduce ? undefined : popItem}
            className={`rounded-lg bg-paper/85 px-3 py-2 text-[0.88rem] italic text-[var(--t-ink)] ring-1 ring-line/40 ${NOTE_TILTS[i % NOTE_TILTS.length]}`}
          >
            {note}
          </motion.span>
        ))}
        <motion.span variants={reduce ? undefined : sparklePop} aria-hidden className="inline-flex">
          <LittleIcon name="sparkle" size={18} />
        </motion.span>
      </motion.div>
    </CardShell>
  );
}

/* ————— gifts: a loose pile of paper slips ————— */

const SLIP_TILTS = ["-rotate-1", "ml-6 rotate-[0.75deg]", "ml-2 -rotate-[0.5deg]"];

function GiftsCard({ className }: { className?: string }) {
  const reveal = useCardReveal();
  const { reduce, inView, replay } = reveal;
  return (
    <CardShell theme="sage" reveal={reveal} className={className}>
      <div className="flex items-start gap-3.5">
        <AnimatedCategoryIcon key={replay} id="gifts" play={inView} size={48} variant="badge" />
        <CardCopy title="Gift ideas" line="Catch the perfect idea before you forget it." />
      </div>
      <motion.ul
        variants={reduce ? undefined : stagger(0.1)}
        initial={reduce ? false : "hidden"}
        animate={reduce || inView ? "show" : "hidden"}
        className="mt-4 flex flex-col items-start"
      >
        {SHOWCASE_GIFT_SCRAPS.map((idea, i) => (
          <motion.li
            key={idea}
            variants={reduce ? undefined : popItem}
            className={`rounded-lg bg-paper/85 px-3 py-1.5 text-[0.88rem] font-semibold text-[var(--t-ink)] shadow-soft ring-1 ring-line/40 ${i > 0 ? "-mt-1" : ""} ${SLIP_TILTS[i]}`}
          >
            {idea}
          </motion.li>
        ))}
      </motion.ul>
    </CardShell>
  );
}

/* ————— the small scraps: mixed shapes so the spread stays handmade ————— */

type Scrap = {
  id: string;
  title: string;
  line: string;
  theme: ThemeColor;
  shape: "row" | "column" | "chip" | "slot";
  className?: string;
};

const SCRAPS: Scrap[] = [
  {
    id: "foods-hate",
    title: "Foods you hate",
    line: "So you never order it twice.",
    theme: "clay",
    shape: "row",
    className: "md:order-6 md:col-span-2 md:-rotate-[0.6deg]",
  },
  {
    id: "restaurants",
    title: "Restaurants to try",
    line: "For the next “where should we eat?”",
    theme: "sky",
    shape: "row",
    className: "md:order-7 md:col-span-2",
  },
  {
    id: "dates",
    title: "Date ideas",
    line: "Tiny plans worth looking forward to.",
    theme: "blush",
    shape: "column",
    className: "md:order-5 md:col-span-2 md:rotate-[0.8deg]",
  },
  {
    id: "obsessions",
    title: "Current obsessions",
    line: "Whatever you can’t stop thinking about.",
    theme: "lavender",
    shape: "chip",
    className: "md:order-8 md:col-span-2 md:rotate-[0.7deg]",
  },
  {
    id: "notes",
    title: "Something totally custom",
    line: "A little world for literally anything.",
    theme: "sage",
    shape: "slot",
    className: "sm:col-span-2 md:order-9 md:col-span-4 md:col-start-2",
  },
];

function ScrapCard({ scrap }: { scrap: Scrap }) {
  const reveal = useCardReveal();
  const { inView, replay } = reveal;

  const layout = {
    row: "flex h-full items-start gap-3.5 p-5",
    column: "flex h-full flex-col items-start gap-3 p-5",
    chip: "flex h-full flex-col items-center justify-center gap-2.5 p-5 text-center",
    slot: "flex h-full items-center justify-center gap-3.5 p-5",
  }[scrap.shape];

  return (
    <CardShell
      theme={scrap.theme}
      reveal={reveal}
      className={scrap.className}
      innerClassName={layout}
      radius={scrap.shape === "chip" ? "rounded-[28px]" : "rounded-2xl"}
      frame={scrap.shape === "slot" ? "border-2 border-dashed border-line/70" : "ring-1 ring-line/30"}
    >
      <AnimatedCategoryIcon key={replay} id={scrap.id} play={inView} size={44} variant="badge" />
      <CardCopy title={scrap.title} line={scrap.line} />
    </CardShell>
  );
}

/* ————— decorative stickers: two, floating barely, hidden on mobile ————— */

function FloatingSticker({
  name,
  className,
  delay,
  rotate,
}: {
  name: "sparkle" | "heart";
  className: string;
  delay: number;
  rotate: number;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.span
      aria-hidden
      animate={reduce ? undefined : gentleFloat(delay)}
      className={`pointer-events-none absolute hidden md:inline-flex ${className}`}
    >
      <LittleIcon name={name} size={34} variant="sticker" rotate={rotate} />
    </motion.span>
  );
}

export function UseCases({
  movies = SHOWCASE_MOVIES,
  books = SHOWCASE_BOOKS,
}: {
  movies?: List;
  books?: List;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <section id="use-cases" className="scroll-mt-20 px-5 py-14">
      <div className="relative mx-auto max-w-5xl">
        <FloatingSticker name="sparkle" className="-top-3 right-4" delay={0} rotate={8} />
        <FloatingSticker name="heart" className="bottom-8 left-6" delay={1.2} rotate={-10} />

        <motion.header
          variants={reduce ? undefined : fadeSlide}
          initial={reduce ? false : "hidden"}
          whileInView={reduce ? undefined : "show"}
          viewport={inViewOnce}
          className="text-center"
        >
          <h2
            className="font-display font-semibold leading-tight text-ink"
            style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}
          >
            Start with anything. Make it a little world.
          </h2>
          <p className="mx-auto mt-3 max-w-[34rem] text-[1rem] leading-relaxed text-brown">
            Movies, books, gift ideas, food opinions, date plans, and tiny details about people
            &mdash; each list gets its own cozy little corner.
          </p>
        </motion.header>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6 md:gap-5">
          <MoviesCard list={movies} className="sm:col-span-2 md:order-1 md:col-span-4 md:row-span-2" />
          <PeopleCard className="sm:col-span-2 md:order-4 md:col-span-4" />
          <BooksCard list={books} className="sm:col-span-2 md:order-2 md:col-span-2" />
          <GiftsCard className="sm:col-span-2 md:order-3 md:col-span-2" />
          {SCRAPS.map((scrap) => (
            <ScrapCard key={scrap.id} scrap={scrap} />
          ))}
        </div>
      </div>
    </section>
  );
}

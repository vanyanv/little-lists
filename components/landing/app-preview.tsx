"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ChevronLeft, CircleUser, LayoutList, Users } from "lucide-react";
import { PREVIEW_MOVIES, PREVIEW_BOOKS, PREVIEW_FOODS, PREVIEW_GIFTS, PREVIEW_PERSON } from "@/lib/landing-data";
import type { List } from "@/lib/types";
import { themeClass, listCountLabel } from "@/lib/visual";
import { LittleIcon } from "@/components/icons/little-icon";
import { PreviewListCard, PreviewPersonCard, PreviewPosterCard } from "./preview-card";

/* A phone-shaped preview of the real app, built from the actual card
   components so it always reflects the live design language. Decorative only —
   it never overflows: the device is width-capped and the screen clips.

   The demo breathes: it alternates between the home screen and the Movies
   list detail (a navigation push, like tapping the card). The home screen
   defines the phone's height; the detail screen slides over it. Cycling
   pauses offscreen and under reduced motion (which pins the home screen). */

const SCREEN_MS = 6200;
const push = { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const };

function MoviesDetailScreen({ movies }: { movies: List }) {
  return (
    <div className={themeClass(movies.theme)} style={{ height: "100%" }}>
      <div className="h-full px-3.5 pb-[4.75rem] pt-7" style={{ background: "var(--t-bg)" }}>
        <header className="flex items-center gap-2.5 px-1">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper shadow-soft">
            <ChevronLeft size={13} strokeWidth={2.4} color="var(--color-ink)" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[1.12rem] font-semibold leading-tight text-ink">
              {movies.title}
            </h3>
            <p className="mt-0.5 text-[0.7rem] font-bold text-brown">{listCountLabel(movies)}</p>
          </div>
        </header>

        <div className="mt-3 flex gap-1.5 px-1">
          <span className="rounded-pill bg-ink px-2.5 py-1 text-[0.66rem] font-bold text-cream">All</span>
          <span className="rounded-pill bg-paper px-2.5 py-1 text-[0.66rem] font-bold text-brown ring-1 ring-line">Want to watch</span>
          <span className="rounded-pill bg-paper px-2.5 py-1 text-[0.66rem] font-bold text-brown ring-1 ring-line">Watched</span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5 px-1">
          {movies.items.map((item) => (
            <PreviewPosterCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppPreview({
  movies = PREVIEW_MOVIES,
  books = PREVIEW_BOOKS,
  onScreenChange,
}: {
  /** preview lists with live artwork from the search APIs; bundled art otherwise */
  movies?: List;
  books?: List;
  onScreenChange?: (screen: "home" | "movies") => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const [inMovies, setInMovies] = useState(false);
  // mirrors inMovies so the interval can flip + notify without calling the
  // parent's setState inside an updater (React runs updaters during render)
  const inMoviesRef = useRef(false);

  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => {
      const next = !inMoviesRef.current;
      inMoviesRef.current = next;
      setInMovies(next);
      onScreenChange?.(next ? "movies" : "home");
    }, SCREEN_MS);
    return () => clearInterval(id);
  }, [reduce, inView, onScreenChange]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[300px]" aria-hidden="true">
      {/* device shell — slim ink bezel with one warm edge highlight along the
          top, so it reads as a tangible object without turning into an ad */}
      <div className="rounded-[2.5rem] bg-ink p-2 ring-1 ring-ink/25 [box-shadow:var(--shadow-lift),inset_0_1px_0_oklch(0.975_0.013_75/0.18)]">
        <div className="paper-grain relative overflow-hidden rounded-[2rem] bg-cream">
          {/* speaker notch */}
          <div className="absolute left-1/2 top-2 z-20 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink/15" />

          {/* home screen — defines the phone's height, recedes under the push */}
          <motion.div
            className="px-3.5 pb-[4.75rem] pt-7"
            initial={false}
            animate={reduce ? undefined : { x: inMovies ? -26 : 0, opacity: inMovies ? 0.55 : 1 }}
            transition={push}
          >
            <header className="px-1">
              <p className="flex items-center gap-1 text-[0.78rem] font-bold text-brown">
                Hi Chris <LittleIcon name="sparkle" size={11} />
              </p>
              <h3 className="mt-0.5 font-display text-[1.55rem] font-semibold leading-none text-ink">
                Your little worlds
              </h3>
            </header>

            {/* the person card sits right under the movies so the first
                cropped glimpse on phones already shows films AND the little
                details kept about someone, not just a list manager */}
            <div className="mt-4 flex flex-col gap-2.5">
              <PreviewListCard list={movies} variant="hero" />
              <PreviewPersonCard person={PREVIEW_PERSON} maxChips={3} />
              <div className="grid grid-cols-2 gap-2.5">
                <PreviewListCard list={books} />
                <PreviewListCard list={PREVIEW_FOODS} />
              </div>
              <PreviewListCard list={PREVIEW_GIFTS} />
            </div>
          </motion.div>

          {/* movies detail screen — slides in like tapping the movies card */}
          <motion.div
            className="paper-grain absolute inset-0"
            initial={false}
            animate={{ x: reduce || !inMovies ? "100%" : "0%" }}
            transition={reduce ? { duration: 0 } : push}
          >
            <MoviesDetailScreen movies={movies} />
          </motion.div>

          {/* floating add button */}
          <div className="absolute bottom-[4.25rem] right-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-ink text-2xl font-light leading-none text-cream shadow-lift">
            +
          </div>

          {/* bottom nav */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3">
            <div className="flex items-stretch justify-around rounded-2xl border border-line/70 bg-paper/85 px-2 py-1.5 shadow-lift backdrop-blur-md">
              <span className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-ink">
                <span className="absolute inset-0 rounded-xl bg-cream-deep" />
                <span className="relative"><LayoutList size={20} strokeWidth={1.8} fill="currentColor" fillOpacity={0.16} /></span>
                <span className="relative text-[0.6rem] font-bold tracking-wide">Lists</span>
              </span>
              <span className="flex flex-1 flex-col items-center gap-0.5 py-1 text-brown-soft">
                <Users size={20} strokeWidth={1.8} />
                <span className="text-[0.6rem] font-bold tracking-wide">People</span>
              </span>
              <span className="flex flex-1 flex-col items-center gap-0.5 py-1 text-brown-soft">
                <CircleUser size={20} strokeWidth={1.8} />
                <span className="text-[0.6rem] font-bold tracking-wide">Profile</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

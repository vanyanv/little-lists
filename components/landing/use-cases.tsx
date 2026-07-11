import type { List } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { Cover } from "@/components/cover";
import { AnimatedCategoryIcon } from "@/components/icons/animated-category-icon";
import { LittleIcon } from "@/components/icons/little-icon";
import {
  SHOWCASE_BOOKS,
  SHOWCASE_GIFT_SCRAPS,
  SHOWCASE_MOVIES,
  SHOWCASE_PEOPLE_SCRAPS,
} from "@/lib/landing-data";

export function UseCases({
  movies = SHOWCASE_MOVIES,
  books = SHOWCASE_BOOKS,
}: {
  movies?: List;
  books?: List;
}) {
  return (
    <section id="use-cases" className="scroll-mt-20 px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-[0.82rem] font-bold text-rosewood">A few ways it helps</p>
          <h2
            className="mt-2 font-display font-semibold leading-tight text-ink"
            style={{ fontSize: "clamp(1.8rem, 6vw, 2.65rem)" }}
          >
            Little things become thoughtful things
          </h2>
          <p className="mt-3 max-w-[38rem] text-[1rem] leading-relaxed text-brown">
            Save something when you hear it, keep the person and context attached, and find it again
            when the moment is right.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-5 sm:gap-6">
          <article
            className={`relative overflow-hidden rounded-[var(--radius-2xl)] p-6 shadow-soft ring-1 ring-line/40 sm:p-8 ${themeClass("blush")}`}
            style={{ background: "var(--t-bg)" }}
          >
            <LittleIcon
              name="heart"
              size={62}
              className="pointer-events-none absolute -right-3 -top-4 opacity-20"
              rotate={12}
            />
            <div className="grid items-center gap-7 md:grid-cols-[0.9fr_1.1fr]">
              <div>
                <AnimatedCategoryIcon id="movies" size={50} variant="badge" play={false} />
                <h3 className="mt-4 font-display text-[1.55rem] font-semibold leading-tight text-[var(--t-ink)]">
                  Save what someone recommends
                </h3>
                <p className="mt-2 max-w-[31rem] text-[0.98rem] leading-relaxed text-[var(--t-ink)]/85">
                  “You have to watch this” becomes a real poster in your movie list, with Maya still
                  attached to the memory.
                </p>
              </div>

              <div className="relative mx-auto flex min-h-52 w-full max-w-md items-center justify-center">
                <div className="absolute left-0 top-2 z-20 max-w-[10rem] -rotate-2 rounded-lg bg-paper px-3 py-2 shadow-lift ring-1 ring-line/50">
                  <p className="text-[0.68rem] font-bold text-brown-soft">Maya said</p>
                  <p className="mt-0.5 font-display text-[0.86rem] font-semibold leading-tight text-ink">
                    “You would love this.”
                  </p>
                </div>
                <div className="flex items-end pl-16 pt-8">
                  {movies.items.slice(0, 3).map((item, index) => (
                    <div
                      key={item.id}
                      className={`relative w-[5.8rem] shrink-0 sm:w-[7rem] ${index > 0 ? "-ml-5" : ""}`}
                      style={{ zIndex: index + 1, rotate: `${[-5, 2, 6][index]}deg` }}
                    >
                      <Cover item={item} rounded="rounded-xl" sizes="112px" className="shadow-lift" />
                    </div>
                  ))}
                </div>
                <span className="absolute bottom-1 right-1 rounded-pill bg-paper px-3 py-1.5 text-[0.75rem] font-bold text-rosewood shadow-soft ring-1 ring-line/50">
                  saved with Maya ♥
                </span>
              </div>
            </div>
          </article>

          <div className="grid gap-5 md:grid-cols-[1.08fr_0.92fr] md:gap-6">
            <article
              className={`relative overflow-hidden rounded-[var(--radius-2xl)] p-6 shadow-soft ring-1 ring-line/40 sm:p-8 ${themeClass("butter")}`}
              style={{ background: "var(--t-bg)" }}
            >
              <AnimatedCategoryIcon id="people" size={48} variant="badge" play={false} />
              <h3 className="mt-4 font-display text-[1.45rem] font-semibold text-[var(--t-ink)]">
                Remember the little things
              </h3>
              <p className="mt-2 text-[0.96rem] leading-relaxed text-[var(--t-ink)]/85">
                The details people mention once, but you will want when you see them again.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {SHOWCASE_PEOPLE_SCRAPS.slice(0, 4).map((note, index) => (
                  <span
                    key={note}
                    className="rounded-lg bg-paper/80 px-3 py-2 text-[0.82rem] font-semibold text-[var(--t-ink)] shadow-soft ring-1 ring-line/40"
                    style={{ rotate: `${[-1.5, 1, -0.5, 1.5][index]}deg` }}
                  >
                    {note}
                  </span>
                ))}
              </div>
            </article>

            <article
              className={`relative overflow-hidden rounded-[var(--radius-2xl)] p-6 shadow-soft ring-1 ring-line/40 sm:p-8 ${themeClass("sage")}`}
              style={{ background: "var(--t-bg)" }}
            >
              <AnimatedCategoryIcon id="gifts" size={48} variant="badge" play={false} />
              <h3 className="mt-4 font-display text-[1.45rem] font-semibold text-[var(--t-ink)]">
                Have something lovely ready
              </h3>
              <p className="mt-2 text-[0.96rem] leading-relaxed text-[var(--t-ink)]/85">
                A birthday gift, Friday restaurant, or tiny plan worth looking forward to.
              </p>
              <div className="mt-5 flex flex-col items-start">
                {SHOWCASE_GIFT_SCRAPS.map((idea, index) => (
                  <span
                    key={idea}
                    className={`rounded-lg bg-paper/85 px-3 py-2 text-[0.82rem] font-bold text-[var(--t-ink)] shadow-soft ring-1 ring-line/40 ${index > 0 ? "-mt-1" : ""}`}
                    style={{ marginLeft: `${index * 1.15}rem`, rotate: `${[-1, 1, -0.5][index]}deg` }}
                  >
                    {idea}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <div className="h-px w-20 bg-line" />
          <p className="max-w-2xl text-[0.92rem] font-semibold leading-relaxed text-brown">
            Also lovely for books, music, food opinions, places, date ideas, wishlists, and anything
            completely yours.
          </p>
          <div className="flex items-center gap-2" aria-hidden>
            <div className="w-9 -rotate-3"><Cover item={books.items[0]} rounded="rounded-md" sizes="36px" /></div>
            <LittleIcon name="headphones" size={18} />
            <LittleIcon name="ramen-bowl" size={18} />
            <LittleIcon name="tulip" size={18} />
            <LittleIcon name="sparkle" size={18} />
          </div>
        </div>
      </div>
    </section>
  );
}

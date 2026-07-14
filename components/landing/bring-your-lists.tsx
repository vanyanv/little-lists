import type { List } from "@/lib/types";
import { Cover } from "@/components/cover";
import { LittleIcon } from "@/components/icons/little-icon";
import { SHOWCASE_MOVIES } from "@/lib/landing-data";

const TILT = ["-rotate-2", "rotate-1", "-rotate-1"] as const;

/**
 * The paste-to-import story: the pasted lines and the found covers are drawn
 * from the same live list, so the before/after always agrees with itself.
 */
export function BringYourLists({ movies = SHOWCASE_MOVIES }: { movies?: List }) {
  const picks = movies.items.slice(0, 3);
  return (
    <section className="border-y border-line/35 bg-sage/15 px-5 py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1.18fr_0.82fr] md:gap-14">
        <div className="md:order-2">
          <span className="inline-flex items-center gap-2 rounded-pill bg-sage/45 px-3 py-1 text-[0.8rem] font-bold text-ink ring-1 ring-line/40">
            <LittleIcon name="tape" size={14} /> Bring your lists
          </span>
          <h2
            className="mt-4 text-balance font-display font-semibold leading-tight text-ink"
            style={{ fontSize: "clamp(1.8rem, 6vw, 2.65rem)" }}
          >
            Already keep lists in Notes? Paste them in
          </h2>
          <p className="mt-3 max-w-[34rem] text-[1rem] leading-relaxed text-brown">
            Copy a list from anywhere, paste the whole thing in, and watch every movie, book, and
            album find its own cover. Fifty lines at a time, one tap to undo.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-xl py-5 md:order-1">
          <div
            className="absolute inset-x-8 top-0 h-full -rotate-1 rounded-[var(--radius-2xl)] bg-sage/30"
            aria-hidden
          />
          <div className="relative rounded-[var(--radius-2xl)] bg-paper p-5 shadow-lift ring-1 ring-line/50 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream-deep">
                <LittleIcon name="tape" size={19} />
              </span>
              <div>
                <p className="font-display text-[1.15rem] font-semibold text-ink">Movies to watch</p>
                <p className="text-[0.78rem] font-semibold text-brown-soft">pasted from Notes</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-cream-deep/60 p-3 ring-1 ring-line/50">
              {picks.map((item) => (
                <p key={item.id} className="py-0.5 text-[0.96rem] font-semibold text-ink">
                  <span aria-hidden className="mr-2 text-brown-soft">
                    –
                  </span>
                  {item.title}
                </p>
              ))}
            </div>

            <div className="relative my-3 ml-5 h-8 border-l border-dashed border-brown-soft/40" aria-hidden>
              <span className="absolute -bottom-1 -left-1 text-brown-soft">⌄</span>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {picks.map((item, i) => (
                <div key={item.id} className={`w-16 ${TILT[i % TILT.length]}`}>
                  <Cover item={item} rounded="rounded-lg" sizes="64px" className="shadow-soft" />
                </div>
              ))}
              <span className="mb-1 ml-2 rounded-pill bg-ink px-3 py-2 text-[0.8rem] font-bold text-cream shadow-soft">
                Covers found ✓
              </span>
            </div>
          </div>
          <LittleIcon
            name="star"
            variant="sticker"
            size={32}
            rotate={-8}
            className="pointer-events-none absolute -left-1 -top-1"
          />
        </div>
      </div>
    </section>
  );
}

import { LittleIcon } from "@/components/icons/little-icon";

export function PocketCapture() {
  return (
    <section className="px-5 py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[0.82fr_1.18fr] md:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-pill bg-sky/35 px-3 py-1 text-[0.8rem] font-bold text-ink ring-1 ring-line/40">
            <LittleIcon name="pencil" size={14} /> Your pocket
          </span>
          <h2
            className="mt-4 font-display font-semibold leading-tight text-ink"
            style={{ fontSize: "clamp(1.8rem, 6vw, 2.65rem)" }}
          >
            Jot it before it flits away
          </h2>
          <p className="mt-3 max-w-[34rem] text-[1rem] leading-relaxed text-brown">
            Drop in a title, thought, or recommendation. Little Lists keeps it safe until you are
            ready to tuck it into the right place.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-xl py-5">
          <div className="absolute inset-x-8 top-0 h-full rotate-1 rounded-[var(--radius-2xl)] bg-sky/25" aria-hidden />
          <div className="relative rounded-[var(--radius-2xl)] bg-paper p-5 shadow-lift ring-1 ring-line/50 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream-deep">
                <LittleIcon name="pencil" size={19} />
              </span>
              <div>
                <p className="font-display text-[1.15rem] font-semibold text-ink">Your pocket</p>
                <p className="text-[0.78rem] font-semibold text-brown-soft">safe now, sorted later</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-cream-deep/60 p-3 ring-1 ring-line/50">
              <p className="text-[0.96rem] font-semibold text-ink">Past Lives, Maya said I would love it</p>
              <p className="mt-1 text-[0.75rem] font-semibold text-brown-soft">saved just now</p>
            </div>

            <div className="relative my-3 ml-5 h-8 border-l border-dashed border-brown-soft/40" aria-hidden>
              <span className="absolute -bottom-1 -left-1 text-brown-soft">⌄</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-pill bg-blush/35 px-3 py-2 text-[0.8rem] font-bold text-rosewood ring-1 ring-line/50">
                Movie found ✓
              </span>
              <span className="rounded-pill bg-butter/45 px-3 py-2 text-[0.8rem] font-bold text-ink ring-1 ring-line/50">
                Maya remembered ✓
              </span>
              <span className="rounded-pill bg-ink px-3 py-2 text-[0.8rem] font-bold text-cream shadow-soft">
                Tuck into Movies →
              </span>
            </div>
          </div>
          <LittleIcon
            name="sparkle"
            variant="sticker"
            size={34}
            rotate={9}
            className="pointer-events-none absolute -right-2 bottom-1"
          />
        </div>
      </div>
    </section>
  );
}

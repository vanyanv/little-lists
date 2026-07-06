import { PREVIEW_MOVIES, PREVIEW_BOOKS, PREVIEW_FOODS, PREVIEW_GIFTS, PREVIEW_PERSON } from "@/lib/landing-data";
import { PreviewListCard, PreviewPersonCard } from "./preview-card";

/* A phone-shaped preview of the real app home, built from the actual card
   components so it always reflects the live design language. Decorative only —
   it never overflows: the device is width-capped and the screen clips. */
function NavGlyph({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={fill ? "currentColor" : "none"} fillOpacity={fill ? 0.16 : 0} />
    </svg>
  );
}

export function AppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]" aria-hidden="true">
      {/* device shell */}
      <div className="rounded-[2.6rem] bg-ink/90 p-2.5 shadow-lift ring-1 ring-ink/20">
        <div className="paper-grain relative overflow-hidden rounded-[2.05rem] bg-cream">
          {/* speaker notch */}
          <div className="absolute left-1/2 top-2 z-20 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink/15" />

          {/* screen */}
          <div className="px-3.5 pb-[4.75rem] pt-7">
            <header className="px-1">
              <p className="text-[0.78rem] font-bold text-brown">Hi Chris ✨</p>
              <h3 className="mt-0.5 font-display text-[1.55rem] font-semibold leading-none text-ink">
                Your little worlds
              </h3>
            </header>

            <div className="mt-4 flex flex-col gap-2.5">
              <PreviewListCard list={PREVIEW_MOVIES} variant="hero" />
              <div className="grid grid-cols-2 gap-2.5">
                <PreviewListCard list={PREVIEW_BOOKS} />
                <PreviewListCard list={PREVIEW_FOODS} />
              </div>
              <PreviewListCard list={PREVIEW_GIFTS} />
              <PreviewPersonCard person={PREVIEW_PERSON} maxChips={3} />
            </div>
          </div>

          {/* floating add button */}
          <div className="absolute bottom-[4.25rem] right-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-ink text-2xl font-light leading-none text-cream shadow-lift">
            +
          </div>

          {/* bottom nav */}
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
            <div className="flex items-stretch justify-around rounded-2xl border border-line/70 bg-paper/85 px-2 py-1.5 shadow-lift backdrop-blur-md">
              <span className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-ink">
                <span className="absolute inset-0 rounded-xl bg-cream-deep" />
                <span className="relative"><NavGlyph d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" fill /></span>
                <span className="relative text-[0.6rem] font-bold tracking-wide">Lists</span>
              </span>
              <span className="flex flex-1 flex-col items-center gap-0.5 py-1 text-brown-soft">
                <NavGlyph d="M9 8.5a3.2 3.2 0 1 0 0 .01M3.5 19c0-3 2.6-5 5.5-5s5.5 2 5.5 5" />
                <span className="text-[0.6rem] font-bold tracking-wide">People</span>
              </span>
              <span className="flex flex-1 flex-col items-center gap-0.5 py-1 text-brown-soft">
                <NavGlyph d="M12 8.4a3.6 3.6 0 1 0 0 .01M5 19.2c.4-3.6 3.3-6 7-6s6.6 2.4 7 6" />
                <span className="text-[0.6rem] font-bold tracking-wide">Profile</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

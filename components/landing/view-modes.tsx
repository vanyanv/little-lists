import type { ViewMode } from "@/lib/types";
import { ViewIcon } from "@/components/view-toggle";

/* The same little movie list, shown the three ways the app can render it, so the
   difference reads at a glance instead of being described with an abstract glyph.
   Presentational only — faux twins of the grid / list / cozy item views. */

const SAMPLE = [
  { emoji: "🎬", title: "Past Lives", theme: "blush" },
  { emoji: "🍿", title: "Paddington", theme: "sage" },
  { emoji: "🌀", title: "Spirited Away", theme: "butter" },
  { emoji: "🎀", title: "Lady Bird", theme: "sky" },
] as const;

const MODES: { mode: ViewMode; title: string; line: string }[] = [
  { mode: "grid", title: "Grid", line: "Posters and covers, laid out like a little gallery." },
  { mode: "list", title: "List", line: "Tidy rows for fast scanning when you just want to scroll." },
  { mode: "cozy", title: "Cozy", line: "Room for notes and the little details on custom lists." },
];

function dot(theme: string) {
  return `var(--color-${theme})`;
}

function GridPreview() {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {SAMPLE.map((s) => (
        <div
          key={s.title}
          className="grid aspect-square place-items-center rounded-lg text-lg shadow-soft"
          style={{ background: dot(s.theme) }}
        >
          {s.emoji}
        </div>
      ))}
    </div>
  );
}

function ListPreview() {
  return (
    <div className="flex flex-col gap-1.5">
      {SAMPLE.slice(0, 3).map((s) => (
        <div key={s.title} className="flex items-center gap-2 rounded-lg bg-paper px-2 py-1.5 shadow-soft">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[0.7rem]" style={{ background: dot(s.theme) }}>
            {s.emoji}
          </span>
          <span className="truncate text-[0.72rem] font-semibold text-ink">{s.title}</span>
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot(s.theme) }} />
        </div>
      ))}
    </div>
  );
}

function CozyPreview() {
  return (
    <div className="flex flex-col gap-1.5">
      {SAMPLE.slice(0, 2).map((s) => (
        <div key={s.title} className="rounded-lg bg-paper p-2 shadow-soft">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.8rem]">{s.emoji}</span>
            <span className="text-[0.72rem] font-semibold text-ink">{s.title}</span>
          </div>
          <div className="mt-1.5 space-y-1">
            <span className="block h-1 w-full rounded-full bg-cream-deep" />
            <span className="block h-1 w-3/5 rounded-full bg-cream-deep" />
          </div>
        </div>
      ))}
    </div>
  );
}

const PREVIEW: Record<ViewMode, () => React.ReactNode> = {
  grid: GridPreview,
  list: ListPreview,
  cozy: CozyPreview,
};

export function ViewModes() {
  return (
    <section className="px-5 py-12">
      <div className="mx-auto grid max-w-4xl items-center gap-9 md:grid-cols-2">
        {/* copy */}
        <div className="text-center md:text-left">
          <h2 className="font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
            See it your way
          </h2>
          <p className="mx-auto mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-brown md:mx-0">
            Every list can be browsed three ways. Pick whatever feels right for what is inside, the same little world, rearranged to suit it.
          </p>
        </div>

        {/* three mini-previews of the same list */}
        <div className="flex flex-col gap-3">
          {MODES.map((m) => {
            const Preview = PREVIEW[m.mode];
            return (
              <div
                key={m.mode}
                className="flex items-center gap-3.5 rounded-2xl bg-cream-deep/50 p-3.5 ring-1 ring-line/40"
              >
                <div className="w-[6.5rem] shrink-0">
                  <Preview />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-ink">
                    <ViewIcon mode={m.mode} size={16} />
                    <h3 className="font-display text-[1.05rem] font-semibold">{m.title}</h3>
                  </div>
                  <p className="mt-1 text-[0.85rem] leading-snug text-ink-soft">{m.line}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

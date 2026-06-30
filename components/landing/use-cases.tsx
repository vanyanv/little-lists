import type { ThemeColor } from "@/lib/types";
import { themeClass } from "@/lib/visual";

type UseCase = { emoji: string; title: string; line: string; theme: ThemeColor };

const USE_CASES: UseCase[] = [
  { emoji: "🎬", title: "Movies to watch", line: "That film everyone keeps recommending.", theme: "blush" },
  { emoji: "📚", title: "Books to read", line: "Your someday-soon reading pile.", theme: "sage" },
  { emoji: "🍴", title: "Foods you hate", line: "So you never order it twice.", theme: "clay" },
  { emoji: "📍", title: "Restaurants to try", line: "Spots to wander into next.", theme: "sky" },
  { emoji: "🌷", title: "Date ideas", line: "Little plans worth looking forward to.", theme: "lavender" },
  { emoji: "🎁", title: "Gift ideas", line: "Catch the perfect idea before you forget it.", theme: "blush" },
  { emoji: "✨", title: "Current obsessions", line: "Whatever you can't stop thinking about.", theme: "sage" },
  { emoji: "🌼", title: "Little things about people", line: "The details that make someone feel seen.", theme: "butter" },
];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 px-5 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <h2 className="font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
            A little list for everything
          </h2>
          <p className="mx-auto mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-brown">
            Whatever you want to keep track of, there's a cozy little corner for it.
          </p>
        </header>

        <div className="mt-9 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {USE_CASES.map((c) => (
            <div key={c.title} className={`rounded-2xl ${themeClass(c.theme)}`}>
              <div
                className="flex h-full items-start gap-3.5 rounded-2xl p-5 shadow-soft ring-1 ring-line/30"
                style={{ background: "var(--t-bg)" }}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-2xl shadow-soft">
                  {c.emoji}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[1.15rem] font-semibold leading-tight text-[var(--t-ink)]">
                    {c.title}
                  </h3>
                  <p className="mt-1 text-[0.92rem] leading-snug text-[var(--t-ink)]/90">{c.line}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

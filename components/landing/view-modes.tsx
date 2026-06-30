import type { ViewMode } from "@/lib/types";
import { ViewIcon } from "@/components/view-toggle";

const MODES: { mode: ViewMode; title: string; line: string }[] = [
  { mode: "grid", title: "Grid", line: "For visual lists, posters and covers laid out like a little gallery." },
  { mode: "list", title: "List", line: "For fast scrolling when you just want to scan everything quickly." },
  { mode: "cozy", title: "Cozy", line: "For notes and custom lists, with room for the little details." },
];

export function ViewModes() {
  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-4xl rounded-[var(--radius-2xl)] bg-paper px-5 py-10 shadow-soft ring-1 ring-line/50 sm:px-8">
        <header className="text-center">
          <h2 className="font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
            See it your way
          </h2>
          <p className="mx-auto mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-brown">
            Every list can be browsed three ways. Pick whatever feels right for what's inside.
          </p>
        </header>

        <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MODES.map((m) => (
            <div key={m.mode} className="rounded-2xl bg-cream-deep/60 p-5 text-center ring-1 ring-line/40">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-paper text-ink shadow-soft">
                <ViewIcon mode={m.mode} size={22} />
              </span>
              <h3 className="mt-4 font-display text-[1.2rem] font-semibold text-ink">{m.title}</h3>
              <p className="mt-1.5 text-[0.9rem] leading-snug text-brown">{m.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

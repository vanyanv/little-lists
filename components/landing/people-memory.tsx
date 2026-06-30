import { PREVIEW_MADDIE } from "@/lib/landing-data";
import { themeClass } from "@/lib/visual";
import { Sticker } from "@/components/sticker";

export function PeopleMemory() {
  const details = PREVIEW_MADDIE.sections;
  return (
    <section className="px-5 py-14">
      <div className="mx-auto grid max-w-4xl items-center gap-9 md:grid-cols-2">
        <div className="text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-butter/50 px-3 py-1 text-[0.8rem] font-bold text-ink ring-1 ring-line/40">
            <Sticker name="heart" size={15} /> People notes
          </span>
          <h2 className="mt-4 font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
            Remember the little things about people
          </h2>
          <p className="mx-auto mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-brown md:mx-0">
            The next time you plan a date or pick a gift, the little details are right where you left them. It's a warm way to care, not a contacts app.
          </p>
        </div>

        {/* Maddie card */}
        <div className={`mx-auto w-full max-w-sm rounded-[var(--radius-2xl)] ${themeClass(PREVIEW_MADDIE.theme)}`}>
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] p-6 shadow-lift ring-1 ring-line/40" style={{ background: "var(--t-bg)" }}>
            <Sticker name="flower" size={56} rotate={-12} className="pointer-events-none absolute -right-3 -top-3 opacity-25" />
            <div className="flex items-center gap-3.5">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-paper text-3xl shadow-soft">
                {PREVIEW_MADDIE.emoji}
              </span>
              <div>
                <h3 className="font-display text-[1.45rem] font-semibold leading-tight text-[var(--t-ink)]">
                  Little things about Maddie
                </h3>
                <p className="mt-0.5 text-[0.9rem] font-medium text-brown">{PREVIEW_MADDIE.note}</p>
              </div>
            </div>

            <ul className="mt-5 flex flex-col gap-2">
              {details.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2.5 rounded-pill bg-paper/75 px-3.5 py-2 text-[0.92rem] font-semibold text-[var(--t-ink)]"
                >
                  <span className="text-[1.05rem]">{d.emoji}</span>
                  {d.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

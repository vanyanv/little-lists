import Link from "next/link";
import { focusRing } from "@/lib/a11y";
import { LockPop } from "./lock-pop";

export function Privacy() {
  return (
    <section className="px-5 py-12">
      <div
        className="mx-auto max-w-2xl rounded-[var(--radius-2xl)] px-6 py-12 text-center ring-1 ring-line/50"
        style={{ background: "color-mix(in oklab, var(--color-sage) 12%, var(--color-cream-deep))" }}
      >
        <LockPop />
        <h2 className="mt-5 font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
          Private by default
        </h2>
        <p className="mx-auto mt-3 max-w-[34rem] text-[1.02rem] leading-relaxed text-ink-soft">
          Your little lists are yours, full stop. Only you can see what you save. No public profiles, no feeds, no ads, and we never sell your taste to anyone.
        </p>
        <Link
          href="/privacy"
          className={`mt-7 inline-flex items-center gap-1.5 rounded-pill bg-paper px-5 py-2.5 text-[0.9rem] font-bold text-ink shadow-soft ring-1 ring-line/60 transition-colors hover:bg-cream ${focusRing}`}
        >
          Read our privacy note <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}

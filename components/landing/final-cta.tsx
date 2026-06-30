import Link from "next/link";
import { focusRingOnDark } from "@/lib/a11y";
import { Sticker } from "@/components/sticker";

export function FinalCta() {
  return (
    <section className="px-5 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-6">
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[var(--radius-2xl)] bg-ink px-6 py-14 text-center shadow-lift">
        <Sticker name="flower" size={64} rotate={-14} className="pointer-events-none absolute -left-4 -top-3 opacity-30" />
        <Sticker name="sparkle" size={52} rotate={12} className="pointer-events-none absolute -bottom-3 -right-2 opacity-30" />
        <h2 className="font-display font-semibold leading-tight text-cream" style={{ fontSize: "clamp(1.8rem, 6.5vw, 2.6rem)" }}>
          Start with one little list
        </h2>
        <p className="mx-auto mt-3 max-w-[26rem] text-[1.02rem] leading-relaxed text-cream/80">
          It only takes a few taps. Watch your tiny archive begin.
        </p>
        <Link
          href="/sign-up"
          className={`mt-7 inline-flex items-center justify-center rounded-pill bg-cream px-8 py-4 text-[1.02rem] font-bold text-ink shadow-soft transition-transform hover:scale-[1.03] ${focusRingOnDark}`}
        >
          Create my Little Lists
        </Link>
      </div>
    </section>
  );
}

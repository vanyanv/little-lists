"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { softSpring, tap } from "@/lib/motion";
import { focusRingOnDark } from "@/lib/a11y";
import { Sticker } from "@/components/sticker";
import { SaveSparkle } from "@/components/icons/save-sparkle";

// Same tactile press as every tappable surface in the app.
const MotionLink = motion.create(Link);

export function FinalCta() {
  const reduce = useReducedMotion();
  // remount SaveSparkle per hover/tap so the little pop replays; 0 = not yet
  const [burst, setBurst] = useState(0);
  const pop = () => setBurst((n) => n + 1);

  return (
    <section className="px-5 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-6">
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[var(--radius-2xl)] bg-ink px-6 py-14 text-center shadow-lift">
        <Sticker name="flower" size={64} rotate={-14} className="pointer-events-none absolute -left-4 -top-3 opacity-30" />
        <Sticker name="sparkle" size={52} rotate={12} className="pointer-events-none absolute -bottom-3 -right-2 opacity-30" />
        <h2 className="font-display font-semibold leading-tight text-cream" style={{ fontSize: "clamp(1.8rem, 6.5vw, 2.6rem)" }}>
          Start with one little list
        </h2>
        <p className="mx-auto mt-3 max-w-[26rem] text-[1.02rem] leading-relaxed text-cream/80">
          Make a movie list, a gift list, a food list, or something totally yours.
        </p>
        <div className="relative mt-7 inline-flex">
          <MotionLink
            href="/sign-up"
            whileTap={reduce ? undefined : tap}
            transition={softSpring}
            onHoverStart={pop}
            onTap={pop}
            className={`inline-flex items-center justify-center rounded-pill bg-cream px-8 py-4 text-[1.02rem] font-bold text-ink shadow-soft transition-colors hover:bg-paper ${focusRingOnDark}`}
          >
            Start your first little list
          </MotionLink>
          {/* the app's save moment, borrowed for the one place the page celebrates */}
          {burst > 0 && <SaveSparkle key={burst} />}
        </div>
        <p className="mt-4 text-[0.85rem] font-semibold text-cream/75">Free to start, and private by default.</p>
        {/* PLACEHOLDER: when a real, verifiable testimonial or usage stat exists, add it here.
            Do not invent quotes or user counts. */}
      </div>
    </section>
  );
}

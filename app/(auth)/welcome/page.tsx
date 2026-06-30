"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { focusRingOnDark, focusRing } from "@/lib/a11y";

export default function WelcomePage() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[32px] bg-paper px-7 py-10 text-center shadow-lift ring-1 ring-line/60"
    >
      <span className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-cream-deep text-5xl shadow-soft">
        🌸
      </span>
      <h1 className="font-display text-[2.4rem] font-semibold leading-tight text-ink">
        Start your little world
      </h1>
      <p className="mx-auto mt-3 max-w-[22rem] text-[1.02rem] leading-relaxed text-brown">
        Make cute little lists for everything you love, hate, and want to remember.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/sign-up"
          className={`rounded-pill bg-ink px-6 py-4 text-[1rem] font-bold text-cream shadow-soft transition-colors hover:bg-ink-soft ${focusRingOnDark}`}
        >
          Create my Little Lists
        </Link>
        <Link
          href="/sign-in"
          className={`rounded-pill bg-paper px-6 py-4 text-[1rem] font-bold text-brown ring-1 ring-line transition-colors hover:bg-cream-deep ${focusRing}`}
        >
          I already have an account
        </Link>
      </div>
    </motion.div>
  );
}

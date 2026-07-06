"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DEMO_NAMES } from "@/lib/demo-names";

/* Crossfades through the demo names so the sample person reads as "anyone you
   care about", not one specific friend. The slot is a grid stack sized by the
   widest name, so the heading never reflows mid-cycle. Reduced motion (and
   the server render) pin the first name. */
export function CyclingName({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % DEMO_NAMES.length), 3200);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <span className={`inline-grid justify-items-start align-bottom ${className}`}>
      {/* invisible sizers hold the slot at the widest name's width; the text
          lives in CSS content so it never leaks into textContent, selection,
          find-in-page, or the SSR copy crawlers read */}
      {DEMO_NAMES.map((n) => (
        <span
          key={n}
          aria-hidden
          data-name={n}
          className="invisible col-start-1 row-start-1 before:content-[attr(data-name)]"
        />
      ))}
      <AnimatePresence initial={false}>
        <motion.span
          key={DEMO_NAMES[i]}
          className="col-start-1 row-start-1"
          initial={reduce ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -7 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {DEMO_NAMES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

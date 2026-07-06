"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { PREVIEW_PERSON } from "@/lib/landing-data";
import { themeClass } from "@/lib/visual";
import { Sticker } from "@/components/sticker";
import { AnimatedCategoryIcon } from "@/components/icons/animated-category-icon";
import { CategoryIcon } from "@/components/icons/category-icon";
import { WHOLE_MOTION } from "@/components/icons/glyph-motion";
import { riseItem, staggerContainer } from "@/lib/motion";
import { CyclingName } from "./cycling-name";

export function PeopleMemory() {
  const reduce = useReducedMotion() ?? false;
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, amount: 0.45 });
  const details = PREVIEW_PERSON.sections;

  return (
    <section className="px-5 py-12">
      <div className="mx-auto grid max-w-4xl items-center gap-9 md:grid-cols-2">
        <div className="text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-butter/50 px-3 py-1 text-[0.8rem] font-bold text-ink ring-1 ring-line/40">
            <Sticker name="heart" size={15} /> People notes
          </span>
          <h2 className="mt-4 font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
            Remember the little things about people
          </h2>
          <p className="mx-auto mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-brown md:mx-0">
            Save someone&rsquo;s likes, dislikes, food preferences, gift ideas, date ideas, and the
            tiny details you don&rsquo;t want to forget. It&rsquo;s a warm way to care, not a contacts app.
          </p>
        </div>

        {/* sample person card — the flower gives one soft pulse as it comes into
            view, reusing the registry's flower character move so the landing
            pulse can never drift from the app's */}
        <div ref={cardRef} className={`mx-auto w-full max-w-sm rounded-[var(--radius-2xl)] ${themeClass(PREVIEW_PERSON.theme)}`}>
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] p-6 shadow-lift ring-1 ring-line/40" style={{ background: "var(--t-bg)" }}>
            <motion.span
              className="pointer-events-none absolute -right-3 -top-3 inline-flex"
              initial={false}
              animate={inView && !reduce ? WHOLE_MOTION.flower : undefined}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
            >
              <Sticker name="flower" size={56} rotate={-12} className="opacity-25" />
            </motion.span>
            <div className="flex items-center gap-3.5">
              <AnimatedCategoryIcon id="people" variant="badge" size={64} play={inView} />
              <div>
                <h3 className="font-display text-[1.45rem] font-semibold leading-tight text-[var(--t-ink)]">
                  Little things about <CyclingName />
                </h3>
                <p className="mt-0.5 text-[0.9rem] font-medium text-[var(--t-ink)]/90">{PREVIEW_PERSON.note}</p>
              </div>
            </div>

            <motion.ul
              variants={reduce ? undefined : staggerContainer}
              initial={reduce ? false : "hidden"}
              animate={reduce || inView ? "show" : "hidden"}
              className="mt-5 flex flex-col gap-2"
            >
              {details.map((d) => (
                <motion.li
                  key={d.id}
                  variants={reduce ? undefined : riseItem}
                  className="flex items-center gap-2.5 rounded-pill bg-paper/75 px-3.5 py-2 text-[0.92rem] font-semibold text-[var(--t-ink)]"
                >
                  <CategoryIcon id={d.id} size={16} />
                  {d.label}
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </section>
  );
}

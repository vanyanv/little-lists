"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { PersonSection } from "@/lib/types";
import { gentleSpring, softSpring } from "@/lib/motion";

/** A warm, bouncy accordion card for one remembered facet of a person. */
export function PersonDetailSection({ section }: { section: PersonSection }) {
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      layout
      transition={softSpring}
      className="overflow-hidden rounded-2xl bg-paper shadow-soft ring-1 ring-line/60"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: "var(--t-bg)" }}>
          {section.emoji}
        </span>
        <span className="flex-1 font-display text-[1.06rem] font-semibold text-ink">{section.label}</span>
        <span className="text-[0.78rem] font-bold text-brown-soft">{section.entries.length}</span>
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={gentleSpring} className="text-brown-soft">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={gentleSpring}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {section.kind === "chips" ? (
                <div className="flex flex-wrap gap-1.5">
                  {section.entries.map((e, i) => (
                    <motion.span
                      key={`${e}-${i}`}
                      layout
                      className="rounded-pill px-3 py-1.5 text-[0.85rem] font-semibold text-[var(--t-ink)]"
                      style={{ background: "var(--t-bg)" }}
                    >
                      {e}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {section.entries.map((e, i) => (
                    <motion.li
                      key={`${e}-${i}`}
                      layout
                      className="rounded-xl bg-cream-deep/70 px-3.5 py-2.5 text-[0.92rem] leading-relaxed text-ink-soft"
                    >
                      {e}
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

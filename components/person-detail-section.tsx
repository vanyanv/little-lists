"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { PersonSection } from "@/lib/types";
import { gentleSpring, softSpring } from "@/lib/motion";
import { focusRingInset } from "@/lib/a11y";
import { CategoryIcon } from "./icons/category-icon";

/** A warm, bouncy accordion card for one remembered facet of a person. */
export function PersonDetailSection({
  section,
  onDelete,
  onEdit,
  onAdd,
}: {
  section: PersonSection;
  onDelete?: (detailId: string) => void;
  onEdit?: (detailId: string) => void;
  onAdd?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : softSpring;
  const bodySpring = reduce ? { duration: 0 } : gentleSpring;

  return (
    <motion.div
      layout
      transition={spring}
      className="overflow-hidden rounded-2xl bg-paper shadow-soft ring-1 ring-line/30"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${focusRingInset}`}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: "var(--t-bg)" }}>
          <CategoryIcon id={section.id} size={18} />
        </span>
        <span className="flex-1 font-display text-[1.06rem] font-semibold text-ink">{section.label}</span>
        <span className="text-[0.78rem] font-bold text-brown-soft">{section.entries.length}</span>
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={bodySpring} className="text-brown-soft">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={bodySpring}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {section.kind === "chips" ? (
                <div className="flex flex-wrap gap-1.5">
                  {section.entries.map((e) => (
                    <motion.span
                      key={e.id}
                      layout
                      className="group inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-[0.85rem] font-semibold text-[var(--t-ink)]"
                      style={{ background: "var(--t-bg)" }}
                    >
                      <button
                        type="button"
                        onClick={() => onEdit?.(e.id)}
                        className={`cursor-pointer text-left rounded ${focusRingInset}`}
                      >
                        {e.title}
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(e.id)}
                          aria-label={`Remove ${e.title}`}
                          className={`relative grid h-7 w-7 place-items-center rounded-full text-[var(--t-ink)]/50 transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-ink/10 hover:text-[var(--t-ink)] ${focusRingInset}`}
                        >
                          <span aria-hidden className="text-base leading-none">×</span>
                        </button>
                      )}
                    </motion.span>
                  ))}
                  {onAdd && (
                    <button
                      type="button"
                      onClick={onAdd}
                      className={`inline-flex items-center gap-1 rounded-pill border border-dashed border-line px-3 py-1.5 text-[0.85rem] font-semibold text-brown-soft transition-colors hover:border-brown-soft/60 hover:text-ink ${focusRingInset}`}
                    >
                      <span aria-hidden className="text-base leading-none">+</span> add
                    </button>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {section.entries.map((e) => (
                    <motion.li
                      key={e.id}
                      layout
                      className="flex items-start gap-2 rounded-xl bg-cream-deep/70 px-3.5 py-2.5 text-[0.92rem] leading-relaxed text-ink-soft"
                    >
                      <button
                        type="button"
                        onClick={() => onEdit?.(e.id)}
                        className={`flex-1 text-left rounded ${focusRingInset}`}
                      >
                        {e.title}
                        {e.note && <span className="mt-0.5 block text-[0.82rem] text-brown">{e.note}</span>}
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(e.id)}
                          aria-label={`Remove ${e.title}`}
                          className={`relative mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-brown-soft transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-ink/10 hover:text-ink ${focusRingInset}`}
                        >
                          <span aria-hidden className="text-base leading-none">×</span>
                        </button>
                      )}
                    </motion.li>
                  ))}
                  {onAdd && (
                    <li>
                      <button
                        type="button"
                        onClick={onAdd}
                        className={`flex w-full items-center gap-1 rounded-xl border border-dashed border-line px-3.5 py-2.5 text-left text-[0.88rem] font-semibold text-brown-soft transition-colors hover:border-brown-soft/60 hover:text-ink ${focusRingInset}`}
                      >
                        <span aria-hidden className="text-base leading-none">+</span> add
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

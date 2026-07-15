"use client";

import { motion, useReducedMotion } from "motion/react";
import { useStore } from "@/lib/store";
import { deriveChecklist } from "@/lib/onboarding";
import { softSpring } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";

/**
 * The tiny first-steps checklist on Home. Every item derives from data the
 * store already holds — no event tracking — so it checks itself off as the
 * user simply uses the app. Gone once everything's done or it's hidden.
 */
export function GettingStartedCard() {
  const { lists, people, profile, dismissChecklist } = useStore();
  const reduce = useReducedMotion();

  if (profile.checklistDismissed) return null;
  const items = deriveChecklist(lists, people);
  if (items.every((i) => i.done)) return null;

  return (
    <section
      aria-label="First little steps"
      className="mt-4 rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-line"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[1.05rem] font-semibold text-ink">
          Try your first little things 🌱
        </h2>
        <button
          type="button"
          onClick={dismissChecklist}
          className={`relative shrink-0 rounded-pill px-2 py-1 text-[0.78rem] font-semibold text-brown-soft transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:bg-cream-deep ${focusRing}`}
        >
          Hide this
        </button>
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                item.done ? "bg-ink" : "ring-[1.5px] ring-line"
              }`}
            >
              {item.done && (
                <motion.svg
                  initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={softSpring}
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  {/* lucide Check geometry; strokeWidth 1.8 in the old 10-unit
                      viewBox scales to 4.3 in 24 units at the same 10px render */}
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="var(--color-cream)"
                    strokeWidth="4.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              )}
            </span>
            <span
              className={`text-[0.9rem] ${
                item.done ? "text-brown-soft line-through decoration-line" : "text-brown"
              }`}
            >
              {item.label}
              {item.done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

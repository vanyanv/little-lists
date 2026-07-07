"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/lib/motion";
import { focusRingOnDark } from "@/lib/a11y";
import { useUi } from "@/lib/ui";

export function FloatingAddButton() {
  const pathname = usePathname();
  const { openItemSheet, openDetailSheet, openListSheet, openPersonSheet } = useUi();
  const reduce = useReducedMotion();

  const onList = pathname.startsWith("/app/list/");
  const onPerson = pathname.startsWith("/app/person/");
  const onPeople = pathname === "/app/people";
  const onHome = pathname === "/app";
  const visible = onHome || onList || onPerson || onPeople;
  if (!visible) return null;

  // Paths are now /app/list/:id and /app/person/:id, so the id is the 4th segment.
  const id = pathname.split("/")[3];
  const label = onPerson
    ? "Add a little detail"
    : onPeople
      ? "Add someone to remember"
      : onList
        ? "Add to this list"
        : "Start a little list";

  const handle = () => {
    if (onPerson && id) openDetailSheet(id);
    else if (onPeople) openPersonSheet();
    else if (onList && id) openItemSheet(id);
    else openListSheet();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="relative w-full max-w-[440px]">
        <motion.button
          type="button"
          onClick={handle}
          aria-label={label}
          initial={reduce ? false : { scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...softSpring, delay: 0.15 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          className={`pointer-events-auto absolute bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-5 text-cream shadow-lift ${focusRingOnDark} ${
            onHome
              ? "flex items-center gap-2 rounded-pill px-5 text-[0.95rem] font-bold"
              : "grid place-items-center rounded-full"
          }`}
          style={{ height: 60, ...(onHome ? {} : { width: 60 }), background: "var(--color-ink)" }}
        >
          <motion.span
            animate={reduce ? {} : { y: [0, -1.5, 0] }}
            transition={reduce ? {} : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-2"
          >
            <span className="text-[1.7rem] leading-none font-light">+</span>
            {onHome && <span className="leading-none">Start a little list</span>}
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}

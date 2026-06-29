"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { softSpring } from "@/lib/motion";
import { useUi } from "@/lib/ui";

export function FloatingAddButton() {
  const pathname = usePathname();
  const { openItemSheet, openDetailSheet, openListSheet, openPersonSheet } = useUi();

  const onList = pathname.startsWith("/list/");
  const onPerson = pathname.startsWith("/person/");
  const onPeople = pathname === "/people";
  const onHome = pathname === "/";
  const visible = onHome || onList || onPerson || onPeople;
  if (!visible) return null;

  const id = pathname.split("/")[2];
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
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...softSpring, delay: 0.15 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          className="pointer-events-auto absolute bottom-[5.25rem] right-5 grid place-items-center rounded-full text-cream shadow-lift"
          style={{ height: 60, width: 60, background: "var(--color-ink)" }}
        >
          <motion.span
            animate={{ y: [0, -1.5, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="text-[1.7rem] leading-none font-light"
          >
            +
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}

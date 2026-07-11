"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { memo, useState } from "react";
import { softSpring, tap } from "@/lib/motion";
import { focusRingInset } from "@/lib/a11y";

interface ExpandableCardProps {
  summary: ReactNode;
  detail?: ReactNode;
  /** when there's no detail, a tap calls this instead (e.g. navigate) */
  onActivate?: () => void;
  className?: string;
  style?: CSSProperties;
  /** stop the summary from being a button (e.g. it contains its own link) */
  staticSummary?: boolean;
}

/** Cult-UI-style soft card: tap the summary to gently expand inline detail. */
export const ExpandableCard = memo(function ExpandableCard({
  summary,
  detail,
  onActivate,
  className = "",
  style,
  staticSummary = false,
}: ExpandableCardProps) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const canExpand = Boolean(detail);
  const spring = reduce ? { duration: 0 } : softSpring;

  const handle = () => {
    if (canExpand) setOpen((o) => !o);
    else onActivate?.();
  };

  return (
    <motion.div layout transition={spring} className={className} style={style}>
      {staticSummary ? (
        summary
      ) : (
        <motion.button
          type="button"
          layout="position"
          onClick={handle}
          whileTap={tap}
          aria-expanded={canExpand ? open : undefined}
          className={`block w-full rounded-2xl text-left ${focusRingInset}`}
        >
          {summary}
        </motion.button>
      )}
      <AnimatePresence initial={false}>
        {open && detail && (
          <motion.div
            key="detail"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            {detail}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

"use client";

import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { softSpring, tap } from "@/lib/motion";

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
export function ExpandableCard({
  summary,
  detail,
  onActivate,
  className = "",
  style,
  staticSummary = false,
}: ExpandableCardProps) {
  const [open, setOpen] = useState(false);
  const canExpand = Boolean(detail);

  const handle = () => {
    if (canExpand) setOpen((o) => !o);
    else onActivate?.();
  };

  return (
    <motion.div layout transition={softSpring} className={className} style={style}>
      {staticSummary ? (
        summary
      ) : (
        <motion.button
          type="button"
          layout="position"
          onClick={handle}
          whileTap={tap}
          aria-expanded={canExpand ? open : undefined}
          className="block w-full text-left"
        >
          {summary}
        </motion.button>
      )}
      <AnimatePresence initial={false}>
        {open && detail && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={softSpring}
            className="overflow-hidden"
          >
            {detail}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

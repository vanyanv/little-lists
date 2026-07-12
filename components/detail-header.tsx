"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { Sticker, type StickerName } from "./sticker";
import { StickerBadge } from "./icons/sticker-badge";

interface DetailHeaderProps {
  emoji: string;
  title: string;
  subtitle?: string;
  sticker?: StickerName;
  menu?: ReactNode;
  /** search/sort/filter rows; docks beneath the pinned strip on scroll */
  controls?: ReactNode;
}

/**
 * One chrome layer plus an in-flow title block.
 * - The strip (back / compact title / menu) is sticky from scroll zero,
 *   transparent over the themed field at rest, fading up an opaque tinted
 *   surface as the title scrolls away (CSS scroll-driven, see globals.css).
 * - The title block is content: its themed field reaches up under the
 *   status bar (negative --strip-h offset) and dissolves into cream.
 * - Renders as a fragment: strip, title block, and controls must be
 *   direct children of the page-level theme wrapper, or sticky unpins
 *   when the header scrolls past. Parent provides the theme-* class.
 */
export function DetailHeader({ emoji, title, subtitle, sticker = "sparkle", menu, controls }: DetailHeaderProps) {
  const router = useRouter();

  return (
    <>
      <div className="detail-strip sticky top-0 z-20 flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <motion.button
          type="button"
          whileTap={tap}
          onClick={() => router.back()}
          aria-label="Back"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper/80 text-ink shadow-soft ${focusRing}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        {/* pure echo of the h1 below, so it stays hidden from the tree */}
        <span
          aria-hidden
          className="detail-strip-title min-w-0 flex-1 truncate text-center font-display text-[1.05rem] font-semibold text-[var(--t-ink)]"
        >
          {title}
        </span>
        <div className="shrink-0">{menu}</div>
      </div>

      <div className="relative z-[1] px-5 pb-8 pt-3">
        {/* themed field: paints behind the transparent strip up to the top
            of the document, dissolves into cream at its bottom edge */}
        <div
          aria-hidden
          className="detail-field paper-grain absolute inset-x-0 -bottom-10 top-[calc(-1*var(--strip-h))] -z-[1]"
        />
        <Sticker
          name={sticker}
          size={92}
          className="pointer-events-none absolute -right-4 -top-8 opacity-20"
          rotate={14}
        />
        <div className="relative flex items-end gap-3">
          <StickerBadge emoji={emoji} size={40} className="-rotate-3" />
          <div className="min-w-0 pb-0.5">
            {/* detail-title has no CSS rule yet: reserved hook for Fraunces
                SOFT/WONK variation settings if the axes are ever loaded */}
            <h1 className="detail-title font-display text-[2.1rem] font-semibold leading-[1.08] text-[var(--t-ink)]">
              {title}
            </h1>
            {subtitle && <p className="mt-1.5 text-[0.92rem] font-semibold text-brown">{subtitle}</p>}
          </div>
        </div>
      </div>

      {controls && (
        <div className="detail-controls sticky z-10 px-4 pb-2 pt-2" style={{ top: "var(--strip-h)" }}>
          {controls}
        </div>
      )}
    </>
  );
}

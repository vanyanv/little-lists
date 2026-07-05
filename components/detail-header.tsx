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
}

/** A themed banner that bleeds to the top. Parent provides the theme-* class. */
export function DetailHeader({ emoji, title, subtitle, sticker = "sparkle", menu }: DetailHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden rounded-b-[2rem] px-5 pb-7 pt-[calc(env(safe-area-inset-top)+1rem)]" style={{ background: "var(--t-bg)" }}>
      <Sticker name={sticker} size={92} className="pointer-events-none absolute -right-4 top-3 opacity-20" rotate={14} />

      <div className="flex items-center justify-between">
        <motion.button
          type="button"
          whileTap={tap}
          onClick={() => router.back()}
          aria-label="Back"
          className={`grid h-10 w-10 place-items-center rounded-full bg-paper/80 text-ink shadow-soft backdrop-blur-sm ${focusRing}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        {menu}
      </div>

      <div className="mt-5 flex items-end gap-3">
        <StickerBadge emoji={emoji} size={64} />
        <div className="min-w-0 pb-0.5">
          <h1 className="font-display text-[1.65rem] font-semibold leading-[1.14] text-[var(--t-ink)]">{title}</h1>
          {subtitle && <p className="mt-1 text-[0.92rem] font-semibold text-brown">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

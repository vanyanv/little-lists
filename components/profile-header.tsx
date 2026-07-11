"use client";

import { motion } from "motion/react";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { themeClass } from "@/lib/visual";
import { softSpring } from "@/lib/motion";
import { ThemeColorPicker } from "./theme-chip";
import { Sticker } from "./sticker";
import { StickerBadge } from "./icons/sticker-badge";

export function ProfileHeader() {
  const { profile, setProfileTheme } = useStore();
  const { user } = useUser();

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-[var(--radius-2xl)] p-6 shadow-soft ring-1 ring-ink/[0.03] ${themeClass(profile.theme)}`}
      style={{ background: "var(--t-bg)" }}
      transition={softSpring}
    >
      <Sticker name="flower" size={70} className="pointer-events-none absolute -right-3 -top-3 opacity-25" rotate={-12} />

      <div className="flex items-center gap-4">
        <StickerBadge emoji={profile.avatarEmoji} size={80} rounded="rounded-[var(--radius-2xl)]" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[1.8rem] font-semibold leading-none text-[var(--t-ink)]">
              {user?.firstName ?? profile.name}
            </h1>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-paper/70 px-2.5 py-1 text-[0.75rem] font-bold text-[var(--t-ink)]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Just for me
          </span>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">your theme color</p>
        <ThemeColorPicker value={profile.theme} onChange={setProfileTheme} />
      </div>
    </motion.div>
  );
}

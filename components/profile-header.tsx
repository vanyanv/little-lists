"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { themeClass } from "@/lib/visual";
import { softSpring } from "@/lib/motion";
import { ThemeColorPicker } from "./theme-chip";
import { Sticker } from "./sticker";
import { Button } from "./button";

export function ProfileHeader() {
  const { profile, setProfileTheme, fireCelebration } = useStore();
  const { user } = useUser();
  const [shared, setShared] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
    } catch {
      window.prompt("Copy your little world", window.location.origin);
    }
    fireCelebration("balloons");
    setShared(true);
    setTimeout(() => setShared(false), 2200);
  };

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-[var(--radius-2xl)] p-6 shadow-soft ring-1 ring-ink/[0.03] ${themeClass(profile.theme)}`}
      style={{ background: "var(--t-bg)" }}
      transition={softSpring}
    >
      <Sticker name="flower" size={70} className="pointer-events-none absolute -right-3 -top-3 opacity-25" rotate={-12} />

      <div className="flex items-center gap-4">
        <motion.span
          layout
          className="grid h-20 w-20 shrink-0 place-items-center rounded-[var(--radius-2xl)] bg-paper text-4xl shadow-soft"
        >
          {profile.avatarEmoji}
        </motion.span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[1.8rem] font-semibold leading-none text-[var(--t-ink)]">
              {user?.firstName ?? profile.name}
            </h1>
          </div>
          <p className="mt-1 text-[0.9rem] font-semibold text-brown">{profile.handle}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-paper/70 px-2.5 py-1 text-[0.72rem] font-bold text-[var(--t-ink)]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {profile.isPublic ? "Public little world" : "Just for me"}
          </span>
        </div>
      </div>

      <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
        <span className="font-display italic">“{profile.bio}”</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.tags.map((t) => (
          <span
            key={t}
            className="rounded-pill bg-paper/70 px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--t-ink)]"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button size="sm" onClick={share} className="flex-1">
          Share your little world
        </Button>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">your theme color</p>
        <ThemeColorPicker value={profile.theme} onChange={setProfileTheme} />
      </div>

      <AnimatePresence>
        {shared && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-3 text-center text-[0.86rem] font-semibold text-[var(--t-ink)]"
          >
            copied your little world ✨
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

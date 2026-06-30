"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  TEMPLATE_META,
  type ListTemplate,
  type ThemeColor,
  type ViewMode,
} from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { softSpring, tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { ViewToggle } from "./view-toggle";
import { EmojiPicker } from "./emoji-picker";
import { ThemeColorPicker } from "./theme-chip";

const TEMPLATE_ORDER: ListTemplate[] = [
  "custom", "movie", "book", "music", "food", "place", "gift", "date", "people",
];

const EMOJI_CHOICES = ["✨", "🎬", "📚", "🍴", "📍", "🎁", "🌷", "🌼", "🛋️", "🎧", "☕", "🍵", "🌿", "🏞️", "💌", "🪩", "🖊️", "🐾"];

export interface ListFormValue {
  name: string;
  template: ListTemplate;
  emoji: string;
  theme: ThemeColor;
  view: ViewMode;
}

interface ListFormFieldsProps {
  value: ListFormValue;
  onChange: (patch: Partial<ListFormValue>) => void;
  /** when a template is chosen, seed emoji/theme/view unless the user already touched them */
  onChooseTemplate: (t: ListTemplate) => void;
}

export function ListFormFields({ value, onChange, onChooseTemplate }: ListFormFieldsProps) {
  const { name, template, emoji, theme, view } = value;

  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const measureRail = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    measureRail();
  }, [measureRail]);

  return (
    <>
      {/* live preview */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--t-bg)" }}>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-2xl shadow-soft">
          {emoji}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[1.05rem] font-semibold text-[var(--t-ink)]">
            {name.trim() || "Your little world"}
          </p>
          <p className="text-[0.8rem] font-semibold text-brown">{TEMPLATE_META[template].label}</p>
        </div>
      </div>

      {/* name */}
      <label className="mt-5 block">
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          name your little world
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Things that give me the ick…"
          className={`w-full rounded-xl border border-line bg-cream-deep/50 px-4 py-3.5 text-[1.05rem] font-medium text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none ${focusRing}`}
        />
      </label>

      {/* template picker */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a starting point</p>
          <motion.span
            animate={{ opacity: atEnd ? 0 : 1, x: atEnd ? 4 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-[0.72rem] font-bold lowercase tracking-tight text-[var(--t-ink)] opacity-80"
            aria-hidden
          >
            swipe for more →
          </motion.span>
        </div>

        <div className="relative">
          <motion.div
            animate={{ opacity: atStart ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8"
            style={{ background: "linear-gradient(to right, var(--color-paper), transparent)" }}
            aria-hidden
          />
          <motion.div
            animate={{ opacity: atEnd ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-11"
            style={{ background: "linear-gradient(to left, var(--color-paper), transparent)" }}
            aria-hidden
          />

          <div
            ref={railRef}
            onScroll={measureRail}
            className="no-scrollbar -mx-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-2 px-2 pb-2 pt-2"
          >
            {TEMPLATE_ORDER.map((t) => {
              const meta = TEMPLATE_META[t];
              const active = t === template;
              return (
                <motion.button
                  key={t}
                  type="button"
                  whileTap={tap}
                  onClick={() => onChooseTemplate(t)}
                  aria-pressed={active}
                  className={`${themeClass(meta.theme)} ${focusRing} relative flex w-[6.25rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition ${
                    active ? "shadow-soft ring-2 ring-[var(--t-edge)]" : "ring-1 ring-[var(--t-edge)]"
                  }`}
                  style={{ background: active ? "var(--t-wash)" : "var(--t-bg)" }}
                >
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={softSpring}
                      className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-ink text-[0.66rem] font-bold text-cream shadow-soft"
                      aria-hidden
                    >
                      ✓
                    </motion.span>
                  )}
                  <span className={`grid h-8 w-8 place-items-center rounded-lg text-lg transition ${active ? "bg-paper shadow-soft" : "bg-paper/70"}`}>
                    {meta.emoji}
                  </span>
                  <span className="text-[0.74rem] font-bold leading-tight text-[var(--t-ink)]">{meta.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* emoji */}
      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">pick a vibe</p>
        <EmojiPicker choices={EMOJI_CHOICES} value={emoji} onChange={(e) => onChange({ emoji: e })} />
      </div>

      {/* theme */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a color</p>
          <span className="text-[0.72rem] font-bold lowercase tracking-tight text-[var(--t-ink)]">{theme}</span>
        </div>
        <ThemeColorPicker value={theme} onChange={(c) => onChange({ theme: c })} />
      </div>

      {/* default view */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">how you&apos;ll browse it</p>
        <ViewToggle value={view} onChange={(v) => onChange({ view: v })} />
      </div>
    </>
  );
}

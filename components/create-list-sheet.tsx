"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import {
  TEMPLATE_META,
  THEME_COLORS,
  type ListTemplate,
  type ThemeColor,
  type ViewMode,
} from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { softSpring, tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";
import { ViewToggle } from "./view-toggle";

const TEMPLATE_ORDER: ListTemplate[] = [
  "custom",
  "movie",
  "book",
  "food",
  "place",
  "gift",
  "date",
  "people",
];

const EMOJI_CHOICES = ["✨", "🎬", "📚", "🍴", "📍", "🎁", "🌷", "🌼", "🛋️", "🎧", "☕", "🍵", "🌿", "🏞️", "💌", "🪩", "🖊️", "🐾"];

export function CreateListSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "list";

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Start a little list">
      {open && <CreateListFlow onClose={closeSheet} />}
    </BottomSheet>
  );
}

function CreateListFlow({ onClose }: { onClose: () => void }) {
  const { addList } = useStore();
  const { showToast } = useUi();
  const router = useRouter();

  const [name, setName] = useState("");
  const [template, setTemplate] = useState<ListTemplate>("custom");
  const [emoji, setEmoji] = useState(TEMPLATE_META.custom.emoji);
  const [emojiTouched, setEmojiTouched] = useState(false);
  const [theme, setTheme] = useState<ThemeColor>(TEMPLATE_META.custom.theme);
  const [view, setView] = useState<ViewMode>(TEMPLATE_META.custom.defaultView);

  // track both edges of the template rail so the fades + "swipe for more" hint
  // appear only when there are actually hidden cards in that direction
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

  const chooseTemplate = (t: ListTemplate) => {
    const meta = TEMPLATE_META[t];
    setTemplate(t);
    setTheme(meta.theme);
    setView(meta.defaultView);
    if (!emojiTouched) setEmoji(meta.emoji);
  };

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const meta = TEMPLATE_META[template];
    const created = addList({
      title: name.trim(),
      emoji,
      theme,
      noun: meta.noun,
      kind: meta.kind,
      template,
      defaultView: view,
    });
    onClose();
    showToast("Your little world is ready ✨");
    router.push(`/list/${created.id}`);
  };

  return (
    <div className={`pt-1 ${themeClass(theme)}`}>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-ink">
        What little list are we starting?
      </h2>
      <p className="mt-1 text-[0.92rem] text-brown">Start with a template or make it totally yours.</p>

      {/* live little preview of the world being made */}
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
          onChange={(e) => setName(e.target.value)}
          placeholder="Things that give me the ick…"
          className="w-full rounded-xl border border-line bg-cream-deep/50 px-4 py-3.5 text-[1.05rem] font-medium text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none"
        />
      </label>

      {/* template picker — a little carousel of starting points */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
            choose a starting point
          </p>
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
          {/* edge fades — only when cards are hidden in that direction */}
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
            className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-1 px-1 pb-1"
          >
            {TEMPLATE_ORDER.map((t) => {
              const meta = TEMPLATE_META[t];
              const active = t === template;
              return (
                <motion.button
                  key={t}
                  type="button"
                  whileTap={tap}
                  onClick={() => chooseTemplate(t)}
                  aria-pressed={active}
                  className={`relative flex w-[6.5rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition ${
                    active
                      ? "bg-[var(--t-wash)] shadow-soft ring-2 ring-[var(--t-edge)]"
                      : "bg-cream-deep/50 ring-1 ring-line/60"
                  }`}
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
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl text-2xl transition ${
                      active ? "bg-paper shadow-soft" : "bg-paper/70"
                    }`}
                  >
                    {meta.emoji}
                  </span>
                  <span
                    className={`text-[0.74rem] font-bold leading-tight ${
                      active ? "text-[var(--t-ink)]" : "text-brown"
                    }`}
                  >
                    {meta.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* emoji */}
      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">pick a vibe</p>
        <div className="grid grid-cols-9 gap-1.5">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setEmoji(e);
                setEmojiTouched(true);
              }}
              className={`grid aspect-square place-items-center rounded-lg text-xl transition ${
                emoji === e ? "bg-cream-deep ring-2 ring-ink/20" : "bg-cream-deep/40"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* theme */}
      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a color</p>
        <div className="flex gap-2.5">
          {THEME_COLORS.map((c) => (
            <motion.button
              key={c}
              type="button"
              whileTap={tap}
              onClick={() => setTheme(c)}
              aria-label={`${c} theme`}
              aria-pressed={theme === c}
              className={`h-9 w-9 rounded-full ring-2 transition ${
                theme === c ? "ring-ink/40" : "ring-black/5"
              }`}
              style={{ background: `var(--color-${c})` }}
            />
          ))}
        </div>
      </div>

      {/* default view */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">how you&apos;ll browse it</p>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <p className="mt-5 text-center text-[0.82rem] text-brown-soft">You can always change this later.</p>

      <motion.button
        type="button"
        whileTap={tap}
        onClick={save}
        disabled={!canSave}
        className="mt-3 w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40"
      >
        Save your little list
      </motion.button>
    </div>
  );
}

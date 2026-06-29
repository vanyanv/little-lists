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
  const [themeTouched, setThemeTouched] = useState(false);
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
    setView(meta.defaultView);
    // don't stomp a color the user picked on purpose; templates only seed it
    if (!themeTouched) setTheme(meta.theme);
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
                  onClick={() => chooseTemplate(t)}
                  aria-pressed={active}
                  className={`${themeClass(meta.theme)} relative flex w-[6.25rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition ${
                    active
                      ? "shadow-soft ring-2 ring-[var(--t-edge)]"
                      : "ring-1 ring-[var(--t-edge)]"
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
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-lg text-lg transition ${
                      active ? "bg-paper shadow-soft" : "bg-paper/70"
                    }`}
                  >
                    {meta.emoji}
                  </span>
                  <span className="text-[0.74rem] font-bold leading-tight text-[var(--t-ink)]">
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

      {/* theme — dimensional beads so even the palest hues read clearly */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
            choose a color
          </p>
          <span className="text-[0.72rem] font-bold lowercase tracking-tight text-[var(--t-ink)]">
            {theme}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          {THEME_COLORS.map((c) => {
            const active = theme === c;
            return (
              <motion.button
                key={c}
                type="button"
                whileTap={tap}
                onClick={() => {
                  setTheme(c);
                  setThemeTouched(true);
                }}
                aria-label={`${c} theme`}
                aria-pressed={active}
                className={`${themeClass(c)} relative grid h-11 w-11 place-items-center rounded-full transition`}
                style={{
                  background:
                    "radial-gradient(125% 125% at 32% 24%, var(--t-wash), var(--t) 72%)",
                  boxShadow: active
                    ? "inset 0 0 0 1px var(--t-edge), 0 0 0 2px var(--color-paper), 0 0 0 4.5px var(--color-ink)"
                    : "inset 0 0 0 1px var(--t-edge), var(--shadow-soft)",
                }}
              >
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={softSpring}
                    className="grid h-5 w-5 place-items-center rounded-full bg-ink/85 text-[0.58rem] font-bold text-cream"
                    aria-hidden
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* default view */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">how you&apos;ll browse it</p>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <p className="mt-5 text-center text-[0.82rem] text-brown-soft">You can always change this later.</p>

      {/* sticky footer so the primary action is always reachable without scrolling */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-3 bg-paper px-5 pb-1 pt-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-t from-paper to-transparent"
        />
        <motion.button
          type="button"
          whileTap={tap}
          onClick={save}
          disabled={!canSave}
          className="w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40"
        >
          Save your little list
        </motion.button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
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
import { tap } from "@/lib/motion";
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

  // "more to scroll" hint for the template rail
  const railRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const onRailScroll = () => {
    const el = railRef.current;
    if (!el) return;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  };

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

      {/* template picker */}
      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          choose a starting point
        </p>
        <div className="relative">
          <div ref={railRef} onScroll={onRailScroll} className="no-scrollbar fade-x flex gap-2 overflow-x-auto pb-1 pr-6">
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
                  className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[0.85rem] font-bold transition ${
                    active ? "bg-ink text-cream shadow-soft" : "bg-cream-deep text-brown ring-1 ring-line/60"
                  }`}
                >
                  <span>{meta.emoji}</span>
                  {meta.label}
                </motion.button>
              );
            })}
          </div>
          {!atEnd && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 rounded-pill bg-paper/90 px-1.5 py-1 text-[0.8rem] font-bold text-brown shadow-soft"
              aria-hidden
            >
              ›
            </motion.span>
          )}
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

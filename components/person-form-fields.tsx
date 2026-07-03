"use client";

import type { ThemeColor } from "@/lib/types";
import { inputPrimary, inputField } from "@/lib/field";
import { EmojiPicker } from "./emoji-picker";
import { ThemeColorPicker } from "./theme-chip";

const EMOJI_CHOICES = ["🌷", "🍔", "☕", "🎧", "🌼", "💛", "🐾", "🌿", "🍵", "📚", "🎬", "🌙", "🪩", "🧁", "🌸", "🫶", "🍂", "✨"];

export interface PersonFormValue {
  name: string;
  emoji: string;
  theme: ThemeColor;
  note: string;
}

interface PersonFormFieldsProps {
  value: PersonFormValue;
  onChange: (patch: Partial<PersonFormValue>) => void;
}

export function PersonFormFields({ value, onChange }: PersonFormFieldsProps) {
  const { name, emoji, theme, note } = value;

  return (
    <>
      {/* live preview */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--t-bg)" }}>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-2xl shadow-soft">
          {emoji}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[1.05rem] font-semibold text-[var(--t-ink)]">
            {name.trim() || "Someone lovely"}
          </p>
          <p className="line-clamp-1 text-[0.8rem] font-semibold text-brown">
            {note.trim() || "the little things about them"}
          </p>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">their name</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Mom, best friend, a partner…"
          className={inputPrimary}
        />
      </label>

      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">pick a vibe</p>
        <EmojiPicker choices={EMOJI_CHOICES} value={emoji} onChange={(e) => onChange({ emoji: e })} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a color</p>
          <span className="text-[0.72rem] font-bold lowercase tracking-tight text-[var(--t-ink)]">{theme}</span>
        </div>
        <ThemeColorPicker value={theme} onChange={(c) => onChange({ theme: c })} />
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          a little note (optional)
        </span>
        <input
          value={note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="horror movies, cozy books, no mushrooms…"
          className={inputField}
        />
      </label>
    </>
  );
}

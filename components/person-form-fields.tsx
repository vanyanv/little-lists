"use client";

import { useState } from "react";
import type { ThemeColor } from "@/lib/types";
import { inputPrimary, inputField } from "@/lib/field";
import { focusRing } from "@/lib/a11y";
import { MONTHS, daysInMonth, formatSpecialDay, parseSpecialDay } from "@/lib/special-day";
import { EmojiPicker } from "./emoji-picker";
import { ThemeColorPicker } from "./theme-chip";

const EMOJI_CHOICES = ["🌷", "🍔", "☕", "🎧", "🌼", "💛", "🐾", "🌿", "🍵", "📚", "🎬", "🌙", "🪩", "🧁", "🌸", "🫶", "🍂", "✨"];

export interface PersonFormValue {
  name: string;
  emoji: string;
  theme: ThemeColor;
  note: string;
  /** an optional "MM-DD" day worth remembering; "" means none */
  specialDay: string;
}

interface PersonFormFieldsProps {
  value: PersonFormValue;
  onChange: (patch: Partial<PersonFormValue>) => void;
}

export function PersonFormFields({ value, onChange }: PersonFormFieldsProps) {
  const { name, emoji, theme, note } = value;

  // month/day are edited locally so a half-filled control (month chosen, no day
  // yet) doesn't churn the serialized value; we emit "MM-DD" only once both land.
  const initial = parseSpecialDay(value.specialDay);
  const [month, setMonth] = useState<string>(initial ? String(initial.month) : "");
  const [day, setDay] = useState<string>(initial ? String(initial.day) : "");

  const emit = (m: string, d: string) => {
    const mNum = Number(m);
    const dNum = Number(d);
    if (m && d && mNum >= 1 && mNum <= 12 && dNum >= 1) {
      onChange({ specialDay: formatSpecialDay(mNum, dNum) });
    } else {
      onChange({ specialDay: "" });
    }
  };

  const onMonth = (m: string) => {
    // clamp a leftover day (e.g. 31 → Feb) so the control stays coherent
    let d = day;
    if (m && d && Number(d) > daysInMonth(Number(m))) {
      d = String(daysInMonth(Number(m)));
      setDay(d);
    }
    setMonth(m);
    emit(m, d);
  };

  const onDay = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    let d = digits;
    if (month && d && Number(d) > daysInMonth(Number(month))) {
      d = String(daysInMonth(Number(month)));
    }
    setDay(d);
    emit(month, d);
  };

  const clearDay = () => {
    setMonth("");
    setDay("");
    onChange({ specialDay: "" });
  };

  const hasDay = month !== "" || day !== "";

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
          placeholder="Maya, Mom, Sam from work…"
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

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">their day (optional) 🎂</p>
          {hasDay && (
            // py-2 + before:-inset-y-1.5 makes a ~45px target that stops short of the
            // month/day row 8px below (6 ≤ 8); nothing interactive sits beside it
            <button
              type="button"
              onClick={clearDay}
              className={`relative rounded-pill px-2 py-2 text-[0.72rem] font-bold text-brown-soft transition-colors before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] hover:text-ink ${focusRing}`}
            >
              no day
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Month"
            value={month}
            onChange={(e) => onMonth(e.target.value)}
            className={`${inputField} min-w-0`}
          >
            <option value="">month</option>
            {MONTHS.map((label, i) => (
              <option key={label} value={String(i + 1)}>
                {label}
              </option>
            ))}
          </select>
          <div className="w-20 shrink-0">
            <input
              aria-label="Day"
              inputMode="numeric"
              value={day}
              onChange={(e) => onDay(e.target.value)}
              placeholder="day"
              className={`${inputField} text-center`}
            />
          </div>
        </div>
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

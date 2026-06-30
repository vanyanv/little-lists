"use client";

import { focusRing } from "@/lib/a11y";

interface EmojiPickerProps {
  choices: string[];
  value: string;
  onChange: (e: string) => void;
}

/** A grid of tappable emoji buttons — shared across list and person form fields. */
export function EmojiPicker({ choices, value, onChange }: EmojiPickerProps) {
  return (
    <div className="grid grid-cols-9 gap-1.5">
      {choices.map((e) => (
        <button
          key={e}
          type="button"
          aria-label={e}
          aria-pressed={value === e}
          onClick={() => onChange(e)}
          className={`grid aspect-square place-items-center rounded-lg text-xl transition ${focusRing} ${
            value === e ? "bg-cream-deep ring-2 ring-ink/20" : "bg-cream-deep/40"
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

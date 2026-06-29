"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { THEME_COLORS, type ThemeColor } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { softSpring, tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";

const EMOJI_CHOICES = ["🌷", "🍔", "☕", "🎧", "🌼", "💛", "🐾", "🌿", "🍵", "📚", "🎬", "🌙", "🪩", "🧁", "🌸", "🫶", "🍂", "✨"];

export function CreatePersonSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "person";

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Add someone to remember">
      {open && <CreatePersonFlow onClose={closeSheet} />}
    </BottomSheet>
  );
}

function CreatePersonFlow({ onClose }: { onClose: () => void }) {
  const { addPerson } = useStore();
  const { showToast } = useUi();
  const router = useRouter();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌷");
  const [theme, setTheme] = useState<ThemeColor>("blush");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const created = await addPerson({
        name: name.trim(),
        emoji,
        theme,
        note: note.trim() || undefined,
      });
      onClose();
      showToast("A new little world of details ✨");
      router.push(`/person/${created.id}`);
    } catch {
      setSaving(false);
      showToast("That didn't save — let's try again 🌿");
    }
  };

  return (
    <div className={`pt-1 ${themeClass(theme)}`}>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-ink">
        Who would you like to remember?
      </h2>
      <p className="mt-1 text-[0.92rem] text-brown">A cozy little place for the details that make them, them.</p>

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
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          their name
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Maddie, Mom, best friend…"
          className="w-full rounded-xl border border-line bg-cream-deep/50 px-4 py-3.5 text-[1.05rem] font-medium text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none"
        />
      </label>

      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">pick a vibe</p>
        <div className="grid grid-cols-9 gap-1.5">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`grid aspect-square place-items-center rounded-lg text-xl transition ${
                emoji === e ? "bg-cream-deep ring-2 ring-ink/20" : "bg-cream-deep/40"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a color</p>
          <span className="text-[0.72rem] font-bold lowercase tracking-tight text-[var(--t-ink)]">{theme}</span>
        </div>
        <div className="flex justify-between gap-2">
          {THEME_COLORS.map((c) => {
            const active = theme === c;
            return (
              <motion.button
                key={c}
                type="button"
                whileTap={tap}
                onClick={() => setTheme(c)}
                aria-label={`${c} theme`}
                aria-pressed={active}
                className={`${themeClass(c)} relative grid h-11 w-11 place-items-center rounded-full transition`}
                style={{
                  background: "radial-gradient(125% 125% at 32% 24%, var(--t-wash), var(--t) 72%)",
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

      <label className="mt-5 block">
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          a little note (optional)
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="horror movies, cozy books, no mushrooms…"
          className="w-full rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.95rem] text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none"
        />
      </label>

      <motion.button
        type="button"
        whileTap={tap}
        onClick={save}
        disabled={!canSave}
        className="mt-6 w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40"
      >
        {saving ? "Making it…" : "Start their little world"}
      </motion.button>
    </div>
  );
}

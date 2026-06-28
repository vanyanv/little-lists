"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";

export function AddDetailSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "detail";
  const personId = open ? sheet.personId : undefined;

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Remember a little detail">
      {open && personId && <DetailFlow key={personId} personId={personId} onClose={closeSheet} />}
    </BottomSheet>
  );
}

function DetailFlow({ personId, onClose }: { personId: string; onClose: () => void }) {
  const { people, addPersonDetail } = useStore();
  const { showToast } = useUi();
  const person = people.find((p) => p.id === personId);
  const [sectionId, setSectionId] = useState(person?.sections[0]?.id ?? "");
  const [text, setText] = useState("");

  if (!person) return null;

  const save = () => {
    if (!text.trim()) return;
    addPersonDetail(person.id, sectionId, text.trim());
    onClose();
    showToast(`Tucked away with ${person.name} ✨`);
  };

  return (
    <div className={`pt-1 ${themeClass(person.theme)}`}>
      <h2 className="font-display text-[1.45rem] font-semibold text-ink">
        Remember a little detail
      </h2>
      <p className="mt-1 text-[0.92rem] text-brown">
        Something about {person.emoji} {person.name} that future you will be glad you kept.
      </p>

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">where does it go?</p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {person.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSectionId(s.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[0.84rem] font-bold transition ${
              s.id === sectionId ? "bg-ink text-cream" : "bg-cream-deep text-brown ring-1 ring-line/60"
            }`}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">the little thing</p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="loves matcha, allergic to cilantro, birthday in March…"
        className="w-full resize-none rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.98rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      <motion.button
        type="button"
        whileTap={tap}
        onClick={save}
        disabled={!text.trim()}
        className="mt-6 w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40"
      >
        Keep it in their little world
      </motion.button>
    </div>
  );
}

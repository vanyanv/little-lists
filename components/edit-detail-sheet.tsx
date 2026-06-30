"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";

export function EditDetailSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "edit-detail";

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Update this little thing">
      {open && sheet.kind === "edit-detail" && (
        <EditDetailFlow
          key={sheet.detailId}
          personId={sheet.personId}
          sectionId={sheet.sectionId}
          detailId={sheet.detailId}
          onClose={closeSheet}
        />
      )}
    </BottomSheet>
  );
}

function EditDetailFlow({
  personId,
  sectionId,
  detailId,
  onClose,
}: {
  personId: string;
  sectionId: string;
  detailId: string;
  onClose: () => void;
}) {
  const { people, updatePersonDetail } = useStore();
  const { showToast } = useUi();
  const person = people.find((p) => p.id === personId);
  const entry = person?.sections.find((s) => s.id === sectionId)?.entries.find((e) => e.id === detailId);

  const [toSectionId, setToSectionId] = useState(sectionId);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [tags, setTags] = useState((entry?.tags ?? []).join(", "));

  if (!person || !entry) return null;

  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    updatePersonDetail(person.id, sectionId, detailId, {
      title: title.trim(),
      note: note.trim() || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      toSectionId: toSectionId !== sectionId ? toSectionId : undefined,
    });
    onClose();
    showToast("Updated ✨");
  };

  return (
    <div className={`pt-1 ${themeClass(person.theme)}`}>
      <h2 className="font-display text-[1.45rem] font-semibold text-ink">Update this little thing</h2>
      <p className="mt-1 text-[0.92rem] text-brown">Edit it, or move it to another little corner.</p>

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">where does it live?</p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {person.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setToSectionId(s.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[0.84rem] font-bold transition ${
              s.id === toSectionId ? "bg-ink text-cream" : "bg-cream-deep text-brown ring-1 ring-line/60"
            }`}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">the little thing</p>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.98rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a note (optional)</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.95rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">tags (optional)</p>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="comma, separated, little, labels"
        className="w-full rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.95rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      <motion.button
        type="button"
        whileTap={tap}
        onClick={save}
        disabled={!canSave}
        className="mt-6 w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40"
      >
        Save changes
      </motion.button>
    </div>
  );
}

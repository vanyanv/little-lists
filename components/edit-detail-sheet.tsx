"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { focusRing } from "@/lib/a11y";
import { inputPrimary, textareaField } from "@/lib/field";
import { Button } from "./button";
import { BottomSheet } from "./bottom-sheet";
import { AnimatedCategoryIcon } from "./icons/animated-category-icon";

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

  if (!person || !entry) return null;

  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    // tags are intentionally omitted — the field is gone, but existing tags on
    // the row (including any seeded ones) must stay put, not be wiped.
    updatePersonDetail(person.id, sectionId, detailId, {
      title: title.trim(),
      note: note.trim() || undefined,
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
            aria-pressed={s.id === toSectionId}
            onClick={() => setToSectionId(s.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[0.84rem] font-bold transition ${focusRing} ${
              s.id === toSectionId ? "bg-ink text-cream" : "bg-cream-deep text-brown ring-1 ring-line/60"
            }`}
          >
            <AnimatedCategoryIcon id={s.id} size={14} play={s.id === toSectionId} />
            {s.label}
          </button>
        ))}
      </div>

      <label htmlFor="edit-detail-title" className="mb-2 mt-5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">the little thing</label>
      <input
        id="edit-detail-title"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="loves matcha, allergic to cilantro, birthday in March…"
        className={inputPrimary}
      />

      <label htmlFor="edit-detail-note" className="mb-2 mt-5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a note (optional)</label>
      <textarea
        id="edit-detail-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="why it matters, the little context behind it…"
        className={textareaField}
      />

      <Button block size="lg" onClick={save} disabled={!canSave} className="mt-6">
        Save it
      </Button>
    </div>
  );
}

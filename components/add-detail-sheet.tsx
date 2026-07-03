"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { focusRing } from "@/lib/a11y";
import { inputPrimary, inputField, textareaField } from "@/lib/field";
import { Button } from "./button";
import { BottomSheet } from "./bottom-sheet";

export function AddDetailSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "detail";
  const personId = open ? sheet.personId : undefined;

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Add a little detail">
      {open && personId && <DetailFlow key={personId} personId={personId} onClose={closeSheet} />}
    </BottomSheet>
  );
}

function DetailFlow({ personId, onClose }: { personId: string; onClose: () => void }) {
  const { people, addPersonDetail } = useStore();
  const { showToast } = useUi();
  const person = people.find((p) => p.id === personId);
  const [sectionId, setSectionId] = useState(person?.sections[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  if (!person) return null;

  const canSave = title.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await addPersonDetail(person.id, sectionId, {
        title: title.trim(),
        note: note.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onClose();
      showToast("Saved this little detail ✨");
    } catch {
      setSaving(false);
      showToast("That didn't save — let's try again 🌿");
    }
  };

  return (
    <div className={`pt-1 ${themeClass(person.theme)}`}>
      <h2 className="font-display text-[1.45rem] font-semibold text-ink">
        Add a little detail
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
            aria-pressed={s.id === sectionId}
            onClick={() => setSectionId(s.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[0.84rem] font-bold transition ${focusRing} ${
              s.id === sectionId ? "bg-ink text-cream" : "bg-cream-deep text-brown ring-1 ring-line/60"
            }`}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      <label htmlFor="add-detail-title" className="mb-2 mt-5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">the little thing</label>
      <input
        id="add-detail-title"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="loves matcha, allergic to cilantro, birthday in March…"
        className={inputPrimary}
      />

      <label htmlFor="add-detail-note" className="mb-2 mt-5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a note (optional)</label>
      <textarea
        id="add-detail-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="why it matters, the little context behind it…"
        className={textareaField}
      />

      <label htmlFor="add-detail-tags" className="mb-2 mt-5 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">tags (optional)</label>
      <input
        id="add-detail-tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="comma, separated, little, labels"
        className={inputField}
      />

      <Button block size="lg" onClick={save} disabled={!canSave} className="mt-6">
        {saving ? "Saving…" : "Keep it in their little world"}
      </Button>
    </div>
  );
}

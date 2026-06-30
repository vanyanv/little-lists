"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";
import { PersonFormFields, type PersonFormValue } from "./person-form-fields";

export function EditPersonSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "edit-person";
  const personId = open ? sheet.personId : undefined;

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Edit their little world">
      {open && personId && <EditPersonFlow key={personId} personId={personId} onClose={closeSheet} />}
    </BottomSheet>
  );
}

function EditPersonFlow({ personId, onClose }: { personId: string; onClose: () => void }) {
  const { people, updatePerson } = useStore();
  const { showToast } = useUi();
  const person = people.find((p) => p.id === personId);

  const [value, setValue] = useState<PersonFormValue>(() => ({
    name: person?.name ?? "",
    emoji: person?.emoji ?? "🌷",
    theme: person?.theme ?? "blush",
    note: person?.note ?? "",
  }));

  if (!person) return null;

  const patch = (p: Partial<PersonFormValue>) => setValue((v) => ({ ...v, ...p }));
  const canSave = value.name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    updatePerson(person.id, {
      name: value.name.trim(),
      emoji: value.emoji,
      theme: value.theme,
      note: value.note.trim(),
    });
    onClose();
    showToast("Updated ✨");
  };

  return (
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-ink">Edit their little world</h2>
      <p className="mt-1 text-[0.92rem] text-brown">Update their name, vibe, or note.</p>

      <PersonFormFields value={value} onChange={patch} />

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

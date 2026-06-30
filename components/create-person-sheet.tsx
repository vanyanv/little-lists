"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { tap } from "@/lib/motion";
import { focusRingOnDark } from "@/lib/a11y";
import { BottomSheet } from "./bottom-sheet";
import { PersonFormFields, type PersonFormValue } from "./person-form-fields";

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

  const [value, setValue] = useState<PersonFormValue>({
    name: "",
    emoji: "🌷",
    theme: "blush",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<PersonFormValue>) => {
    setValue((v) => ({ ...v, ...p }));
  };

  const canSave = value.name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const created = await addPerson({
        name: value.name.trim(),
        emoji: value.emoji,
        theme: value.theme,
        note: value.note.trim() || undefined,
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
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-ink">
        Who would you like to remember?
      </h2>
      <p className="mt-1 text-[0.92rem] text-brown">A cozy little place for the details that make them, them.</p>

      <PersonFormFields value={value} onChange={patch} />

      <motion.button
        type="button"
        whileTap={tap}
        onClick={save}
        disabled={!canSave}
        className={`mt-6 w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40 ${focusRingOnDark}`}
      >
        {saving ? "Making it…" : "Start their little world"}
      </motion.button>
    </div>
  );
}

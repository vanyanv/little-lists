"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { sheetTitle } from "@/lib/field";
import { Button } from "./button";
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
    specialDay: "",
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
        specialDay: value.specialDay || undefined,
      });
      onClose();
      showToast("A new little world of details ✨");
      router.push(`/app/person/${created.id}`);
    } catch {
      setSaving(false);
      showToast("That didn't save. Let's try again 🌿");
    }
  };

  return (
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className={sheetTitle}>
        Who would you like to remember?
      </h2>
      <p className="mt-1 text-[0.92rem] text-brown">A cozy little place for the details that make them, them.</p>

      <PersonFormFields value={value} onChange={patch} />

      {/* sticky footer so the primary action is always reachable without scrolling */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-3 bg-paper px-5 pb-1 pt-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-t from-paper to-transparent"
        />
        <Button block size="lg" onClick={save} disabled={!canSave}>
          {saving ? "Making it…" : "Start their little world"}
        </Button>
      </div>
    </div>
  );
}

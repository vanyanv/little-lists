"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { TEMPLATE_META, type ListTemplate } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { sheetTitle } from "@/lib/field";
import { Button } from "./button";
import { BottomSheet } from "./bottom-sheet";
import { ListFormFields, type ListFormValue } from "./list-form-fields";

export function EditListSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "edit-list";
  const listId = open ? sheet.listId : undefined;

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Edit this little list">
      {open && listId && <EditListFlow key={listId} listId={listId} onClose={closeSheet} />}
    </BottomSheet>
  );
}

function EditListFlow({ listId, onClose }: { listId: string; onClose: () => void }) {
  const { lists, updateList } = useStore();
  const { showToast } = useUi();
  const list = lists.find((l) => l.id === listId);

  const [value, setValue] = useState<ListFormValue>(() => ({
    name: list?.title ?? "",
    template: list?.template ?? "custom",
    emoji: list?.emoji ?? TEMPLATE_META.custom.emoji,
    theme: list?.theme ?? TEMPLATE_META.custom.theme,
    view: list?.defaultView ?? TEMPLATE_META[list?.template ?? "custom"].defaultView,
  }));

  if (!list) return null;

  const patch = (p: Partial<ListFormValue>) => setValue((v) => ({ ...v, ...p }));
  // editing: choosing a template only switches the starting point; it does not
  // stomp the title/emoji/theme the user already set
  const chooseTemplate = (t: ListTemplate) =>
    setValue((v) => ({ ...v, template: t, view: TEMPLATE_META[t].defaultView }));

  const canSave = value.name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    updateList(list.id, {
      title: value.name.trim(),
      emoji: value.emoji,
      theme: value.theme,
      template: value.template,
      defaultView: value.view,
    });
    onClose();
    showToast("All tucked in ✨");
  };

  return (
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className={sheetTitle}>Edit this little list</h2>
      <p className="mt-1 text-[0.92rem] text-brown">Tweak the name, vibe, or how you browse it.</p>

      <ListFormFields value={value} onChange={patch} onChooseTemplate={chooseTemplate} />

      <div className="sticky bottom-0 z-10 -mx-5 mt-5 bg-paper px-5 pb-1 pt-3">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-t from-paper to-transparent" />
        <Button block size="lg" onClick={save} disabled={!canSave}>
          Save it
        </Button>
      </div>
    </div>
  );
}

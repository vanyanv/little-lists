"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStoreActions } from "@/lib/store";
import { useUi } from "@/lib/ui";
import {
  TEMPLATE_META,
  type ListTemplate,
} from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { sheetTitle } from "@/lib/field";
import { Button } from "./button";
import { BottomSheet } from "./bottom-sheet";
import { ListFormFields, type ListFormValue } from "./list-form-fields";

export function CreateListSheet() {
  const { sheet, closeSheet } = useUi();
  const listSheet = sheet?.kind === "list" ? sheet : null;

  return (
    <BottomSheet open={!!listSheet} onClose={closeSheet} ariaLabel="Start a little list">
      {listSheet && <CreateListFlow onClose={closeSheet} initialTemplate={listSheet.template} />}
    </BottomSheet>
  );
}

function CreateListFlow({
  onClose,
  initialTemplate,
}: {
  onClose: () => void;
  /** pre-picks a template (e.g. from Home's starter chips); the form stays editable */
  initialTemplate?: ListTemplate;
}) {
  const { addList } = useStoreActions();
  const { showToast } = useUi();
  const router = useRouter();

  const startTemplate = initialTemplate ?? "custom";
  const [value, setValue] = useState<ListFormValue>({
    name: "",
    template: startTemplate,
    emoji: TEMPLATE_META[startTemplate].emoji,
    theme: TEMPLATE_META[startTemplate].theme,
    view: TEMPLATE_META[startTemplate].defaultView,
  });
  const [emojiTouched, setEmojiTouched] = useState(false);
  const [themeTouched, setThemeTouched] = useState(false);

  const patch = (p: Partial<ListFormValue>) => {
    if (p.emoji !== undefined) setEmojiTouched(true);
    if (p.theme !== undefined) setThemeTouched(true);
    setValue((v) => ({ ...v, ...p }));
  };

  const chooseTemplate = (t: ListTemplate) => {
    const meta = TEMPLATE_META[t];
    setValue((v) => ({
      ...v,
      template: t,
      view: meta.defaultView,
      theme: themeTouched ? v.theme : meta.theme,
      emoji: emojiTouched ? v.emoji : meta.emoji,
    }));
  };

  const [saving, setSaving] = useState(false);
  const canSave = value.name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const created = await addList({
        title: value.name.trim(),
        emoji: value.emoji,
        theme: value.theme,
        template: value.template,
        defaultView: value.view,
      });
      onClose();
      showToast("Your little world is ready ✨");
      router.push(`/app/list/${created.id}`);
    } catch {
      setSaving(false);
      showToast("That didn't save. Let's try again 🌿");
    }
  };

  return (
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className={sheetTitle}>
        What little list are we starting?
      </h2>
      <p className="mt-1 text-[0.92rem] text-brown">Start with a template or make it totally yours.</p>

      <ListFormFields value={value} onChange={patch} onChooseTemplate={chooseTemplate} showView={false} personalizeCollapsed />

      <p className="mt-5 text-center text-[0.82rem] text-brown-soft">You can always change this later.</p>

      {/* sticky footer so the primary action is always reachable without scrolling */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-3 bg-paper px-5 pb-1 pt-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-t from-paper to-transparent"
        />
        <Button block size="lg" onClick={save} disabled={!canSave}>
          {saving ? "Making it…" : "Save your little list"}
        </Button>
      </div>
    </div>
  );
}

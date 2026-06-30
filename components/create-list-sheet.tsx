"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import {
  TEMPLATE_META,
  type ListTemplate,
} from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { tap } from "@/lib/motion";
import { focusRingOnDark } from "@/lib/a11y";
import { BottomSheet } from "./bottom-sheet";
import { ListFormFields, type ListFormValue } from "./list-form-fields";

export function CreateListSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "list";

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Start a little list">
      {open && <CreateListFlow onClose={closeSheet} />}
    </BottomSheet>
  );
}

function CreateListFlow({ onClose }: { onClose: () => void }) {
  const { addList } = useStore();
  const { showToast } = useUi();
  const router = useRouter();

  const [value, setValue] = useState<ListFormValue>({
    name: "",
    template: "custom",
    emoji: TEMPLATE_META.custom.emoji,
    theme: TEMPLATE_META.custom.theme,
    view: TEMPLATE_META.custom.defaultView,
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
      router.push(`/list/${created.id}`);
    } catch {
      setSaving(false);
      showToast("That didn't save — let's try again 🌿");
    }
  };

  return (
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-ink">
        What little list are we starting?
      </h2>
      <p className="mt-1 text-[0.92rem] text-brown">Start with a template or make it totally yours.</p>

      <ListFormFields value={value} onChange={patch} onChooseTemplate={chooseTemplate} />

      <p className="mt-5 text-center text-[0.82rem] text-brown-soft">You can always change this later.</p>

      {/* sticky footer so the primary action is always reachable without scrolling */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-3 bg-paper px-5 pb-1 pt-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-t from-paper to-transparent"
        />
        <motion.button
          type="button"
          whileTap={tap}
          onClick={save}
          disabled={!canSave}
          className={`w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40 ${focusRingOnDark}`}
        >
          {saving ? "Making it…" : "Save your little list"}
        </motion.button>
      </div>
    </div>
  );
}

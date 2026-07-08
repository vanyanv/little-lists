"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { Person } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { hover, softSpring, tap } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRingStretched } from "@/lib/a11y";
import { OverflowMenu } from "./overflow-menu";
import { CategoryIcon } from "./icons/category-icon";
import { StickerBadge } from "./icons/sticker-badge";

export function PersonCard({ person }: { person: Person }) {
  const chips = person.sections.filter((s) => s.entries.length > 0).slice(0, 5);
  const { deletePerson } = useStore();
  const { openEditPerson, openConfirm, showToast } = useUi();

  return (
    <motion.div
      layout
      whileHover={hover}
      whileTap={tap}
      transition={softSpring}
      className={`relative rounded-2xl p-4 shadow-soft ring-1 ring-line/30 ${themeClass(person.theme)}`}
      style={{ background: "var(--t-bg)" }}
    >
      <div className="flex items-center gap-3.5 pr-10">
        <StickerBadge emoji={person.emoji} size={56} />
        <div className="min-w-0">
          <h3 className="font-display text-[1.2rem] font-semibold leading-tight text-[var(--t-ink)]">
            {/* stretched link: covers the whole card via ::after, so the ⋯ menu
                (a sibling, not a descendant) stays valid, separately-focusable HTML */}
            <Link href={`/app/person/${person.id}`} className={focusRingStretched}>
              {person.name}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[0.86rem] font-medium text-brown">{person.note}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 rounded-pill bg-paper/70 px-2.5 py-1 text-[0.75rem] font-semibold text-[var(--t-ink)]"
          >
            <CategoryIcon id={s.id} size={12} /> {s.label}
          </span>
        ))}
      </div>
      {/* menu renders after the link in source order, so keyboard/SR users reach the
          card link before its menu button (a11y, not a layout-affecting z-20 overlay) */}
      <div className="absolute right-2.5 top-2.5 z-20">
        <OverflowMenu
          ariaLabel={`Options for ${person.name}`}
          stopPropagation
          items={[
            { label: "Edit person", onSelect: () => openEditPerson(person.id) },
            {
              label: "Delete person",
              tone: "danger",
              onSelect: () =>
                openConfirm({
                  title: "Remove this person?",
                  body: "This clears their page and every little detail you kept.",
                  confirmLabel: "Delete person",
                  tone: "danger",
                  onConfirm: () => {
                    const handle = deletePerson(person.id);
                    showToast("Gone, along with their little details", {
                      action: { label: "Undo", onAction: handle.undo },
                      onExpire: handle.commit,
                    });
                  },
                }),
            },
          ]}
        />
      </div>
    </motion.div>
  );
}

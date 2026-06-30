"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { Person } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { hover, softSpring, tap } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRing } from "@/lib/a11y";
import { OverflowMenu } from "./overflow-menu";

export function PersonCard({ person }: { person: Person }) {
  const chips = person.sections.filter((s) => s.entries.length > 0).slice(0, 5);
  const { deletePerson } = useStore();
  const { openEditPerson, openConfirm, showToast } = useUi();

  return (
    <Link href={`/app/person/${person.id}`} className={`block rounded-2xl ${themeClass(person.theme)} ${focusRing}`}>
      <motion.div
        layout
        whileHover={hover}
        whileTap={tap}
        transition={softSpring}
        className="relative rounded-2xl p-4 shadow-soft ring-1 ring-line/30"
        style={{ background: "var(--t-bg)" }}
      >
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
                    body: "This will delete them and every little detail you saved.",
                    confirmLabel: "Delete person",
                    tone: "danger",
                    onConfirm: () => {
                      deletePerson(person.id);
                      showToast("Removed from your little world");
                    },
                  }),
              },
            ]}
          />
        </div>
        <div className="flex items-center gap-3.5 pr-10">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-paper text-2xl shadow-soft">
            {person.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[1.2rem] font-semibold leading-tight text-[var(--t-ink)]">
              {person.name}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[0.86rem] font-medium text-brown">{person.note}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((s) => (
            <span
              key={s.id}
              className="rounded-pill bg-paper/70 px-2.5 py-1 text-[0.72rem] font-semibold text-[var(--t-ink)]"
            >
              {s.emoji} {s.label}
            </span>
          ))}
        </div>
      </motion.div>
    </Link>
  );
}

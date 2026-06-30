"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { usePerson, useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { staggerContainer, riseItem, tap } from "@/lib/motion";
import { DetailHeader } from "@/components/detail-header";
import { PersonDetailSection } from "@/components/person-detail-section";
import { EmptyState } from "@/components/empty-state";
import { OverflowMenu } from "@/components/overflow-menu";

export default function PersonDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const person = usePerson(id);
  const { deletePersonDetail, deletePerson } = useStore();
  const { openDetailSheet, openEditPerson, openConfirm, showToast } = useUi();
  const router = useRouter();

  if (!person) {
    return (
      <div className="px-6 pt-32 text-center">
        <p className="font-display text-[1.4rem] font-semibold text-ink">We can&apos;t find that person</p>
        <Link href="/people" className="mt-6 inline-block rounded-pill bg-ink px-5 py-3 text-sm font-bold text-cream">
          Back to your people
        </Link>
      </div>
    );
  }

  const filledSections = person.sections.filter((s) => s.entries.length > 0);

  const personMenu = (
    <OverflowMenu
      ariaLabel="Person options"
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
                router.replace("/people");
              },
            }),
        },
      ]}
    />
  );

  return (
    <div className={themeClass(person.theme)}>
      <DetailHeader
        emoji={person.emoji}
        title={`Little things about ${person.name}`}
        subtitle={person.note}
        sticker="heart"
        menu={personMenu}
      />

      {filledSections.length === 0 ? (
        <EmptyState
          sticker="heart"
          title="No little details yet"
          hint="Save the first one and start a cozy archive of what makes them, them."
          action={
            <motion.button
              type="button"
              whileTap={tap}
              onClick={() => openDetailSheet(person.id)}
              className="rounded-pill bg-ink px-6 py-3.5 text-[0.95rem] font-bold text-cream shadow-lift"
            >
              Add a little detail
            </motion.button>
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 px-4 pt-5"
        >
          {filledSections.map((s) => (
            <motion.div key={s.id} variants={riseItem}>
              <PersonDetailSection
                section={s}
                onDelete={(detailId) => deletePersonDetail(person.id, s.id, detailId)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

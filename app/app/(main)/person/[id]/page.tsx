"use client";

import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { usePerson, useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { staggerContainer, riseItem } from "@/lib/motion";
import { DetailHeader } from "@/components/detail-header";
import { PersonDetailSection } from "@/components/person-detail-section";
import { EmptyState } from "@/components/empty-state";
import { OverflowMenu } from "@/components/overflow-menu";
import { Button } from "@/components/button";

export default function PersonDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const person = usePerson(id);
  const { deletePersonDetail, deletePerson } = useStore();
  const { openDetailSheet, openEditPerson, openConfirm, showToast, openEditDetail } = useUi();
  const router = useRouter();
  const reduce = useReducedMotion();

  if (!person) {
    return (
      <div className="px-6 pt-32 text-center">
        <h1 className="font-display text-[1.4rem] font-semibold text-ink">We can&apos;t find that person</h1>
        <Button href="/app/people" size="sm" className="mt-6">
          Back to your people
        </Button>
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
                router.replace("/app/people");
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
          action={<Button onClick={() => openDetailSheet(person.id)}>Add a little detail</Button>}
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial={reduce ? false : "hidden"}
          animate="show"
          className="flex flex-col gap-3 px-4 pt-5"
        >
          {filledSections.map((s) => (
            <motion.div key={s.id} variants={riseItem}>
              <PersonDetailSection
                section={s}
                onEdit={(detailId) => openEditDetail(person.id, s.id, detailId)}
                onDelete={(detailId) =>
                  openConfirm({
                    title: "Remove this little thing?",
                    body: "It'll be gone from their little world.",
                    confirmLabel: "Remove",
                    tone: "danger",
                    onConfirm: () => {
                      deletePersonDetail(person.id, s.id, detailId);
                      showToast("Removed from your little world");
                    },
                  })
                }
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

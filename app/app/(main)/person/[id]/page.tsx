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
import { AnimatedCategoryIcon } from "@/components/icons/animated-category-icon";
import { focusRing } from "@/lib/a11y";

// starter prompts for an empty person — each opens the add sheet on its section
const STARTER_PROMPTS: { sectionId: string; label: string }[] = [
  { sectionId: "food", label: "What do they always order? 🍴" },
  { sectionId: "gifts", label: "A gift idea before you forget 🎁" },
  { sectionId: "movies", label: "Something they said they'd love to watch 🎬" },
];

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
        <h1 className="font-display text-[1.4rem] font-semibold text-ink">Hmm, we can&apos;t find that person</h1>
        <p className="mt-2 text-brown">They may have wandered off.</p>
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
              body: "This clears their page and every little detail you kept.",
              confirmLabel: "Delete person",
              tone: "danger",
              onConfirm: () => {
                const handle = deletePerson(person.id);
                showToast("Gone, along with their little details", {
                  action: { label: "Undo", onAction: handle.undo },
                  onExpire: handle.commit,
                });
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
        <div>
          <EmptyState
            sticker="heart"
            title="No little details yet"
            hint="Save the first one and start a cozy archive of what makes them, them."
            action={<Button onClick={() => openDetailSheet(person.id)}>Add a little detail</Button>}
          />
          <div className="mx-auto mt-2 flex max-w-[22rem] flex-col gap-2 px-6 pb-6">
            <p className="text-center text-[0.8rem] font-semibold text-brown-soft">or start with a little prompt</p>
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt.sectionId}
                type="button"
                onClick={() => openDetailSheet(person.id, prompt.sectionId)}
                className={`flex w-full items-center gap-2.5 rounded-2xl bg-paper px-4 py-3 text-left text-[0.92rem] font-semibold text-ink shadow-soft ring-1 ring-line/40 transition-colors hover:bg-cream-deep ${focusRing}`}
              >
                <AnimatedCategoryIcon id={prompt.sectionId} size={18} play={false} />
                <span className="flex-1">{prompt.label}</span>
                <span aria-hidden className="text-brown-soft">+</span>
              </button>
            ))}
          </div>
        </div>
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
                onAdd={() => openDetailSheet(person.id, s.id)}
                onEdit={(detailId) => openEditDetail(person.id, s.id, detailId)}
                onDelete={(detailId) =>
                  openConfirm({
                    title: "Remove this little thing?",
                    body: "It'll be gone from their little world.",
                    confirmLabel: "Remove",
                    tone: "danger",
                    onConfirm: () => {
                      const handle = deletePersonDetail(person.id, s.id, detailId);
                      showToast("Removed that little detail", {
                        action: { label: "Undo", onAction: handle.undo },
                        onExpire: handle.commit,
                      });
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

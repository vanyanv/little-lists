"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { usePerson } from "@/lib/store";
import { themeClass } from "@/lib/visual";
import { staggerContainer, riseItem } from "@/lib/motion";
import { DetailHeader } from "@/components/detail-header";
import { PersonDetailSection } from "@/components/person-detail-section";

export default function PersonDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const person = usePerson(id);

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

  return (
    <div className={themeClass(person.theme)}>
      <DetailHeader
        emoji={person.emoji}
        title={`Little things about ${person.name}`}
        subtitle={person.note}
        sticker="heart"
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3 px-4 pt-5"
      >
        {person.sections.map((s) => (
          <motion.div key={s.id} variants={riseItem}>
            <PersonDetailSection section={s} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

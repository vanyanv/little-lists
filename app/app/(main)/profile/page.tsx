"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { ITEM_TYPE_META } from "@/lib/types";
import { focusRing } from "@/lib/a11y";
import { ProfileHeader } from "@/components/profile-header";
import { Cover } from "@/components/cover";
import { Button } from "@/components/button";
import { LittleIcon } from "@/components/icons/little-icon";

export default function ProfileScreen() {
  const { lists } = useStore();

  const loved = useMemo(() => {
    const out: { listId: string; item: (typeof lists)[number]["items"][number] }[] = [];
    for (const l of lists) {
      for (const item of l.items) {
        if (item.status === "favorite" || item.status === "love") out.push({ listId: l.id, item });
      }
    }
    return out.slice(0, 10);
  }, [lists]);

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <p className="px-1 text-[0.92rem] font-bold text-brown">Your little corner 🌙</p>
      <div className="mt-3">
        <ProfileHeader />
      </div>

      {/* things you love */}
      {loved.length > 0 && (
        <section className="mt-8" aria-label="A few things you love">
          <h2 className="px-1 font-display text-[1.3rem] font-semibold text-ink">A few things you love</h2>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {loved.map(({ listId, item }) => {
              const isPoster = ITEM_TYPE_META[item.type].aspect !== "note";
              return (
                <Link key={item.id} href={`/app/list/${listId}`} className={`w-[5.5rem] shrink-0 rounded-xl ${focusRing}`}>
                  {isPoster ? (
                    <Cover
                      item={item}
                      badge={<LittleIcon name="heart-tiny" size={13} className="text-rosewood" />}
                      className="shadow-soft ring-1 ring-ink/5"
                      sizes="88px"
                    />
                  ) : (
                    <div className="grid aspect-[2/3] place-items-center rounded-xl bg-cream-deep text-4xl shadow-soft ring-1 ring-line/60">
                      {item.emoji ?? <LittleIcon name="sparkle" size={34} />}
                    </div>
                  )}
                  <p className="mt-1.5 line-clamp-2 text-center text-[0.76rem] font-semibold leading-tight text-ink">
                    {item.title}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-10 mb-4 flex justify-center">
        <SignOutButton>
          <Button variant="soft" size="sm">Sign out of your little world</Button>
        </SignOutButton>
      </div>
    </div>
  );
}

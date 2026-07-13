"use client";

import Link from "next/link";
import { memo } from "react";
import { motion } from "motion/react";
import type { List } from "@/lib/types";
import { TEMPLATE_META } from "@/lib/types";
import { listCountLabel, themeClass } from "@/lib/visual";
import { hover, softSpring, tap } from "@/lib/motion";
import { useStoreActions } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRingStretched } from "@/lib/a11y";
import { trackProductEvent } from "@/lib/analytics-client";
import { CardStack } from "./card-stack";
import { Sticker } from "./sticker";
import { StickerBadge } from "./icons/sticker-badge";
import { OverflowMenu } from "./overflow-menu";

interface ListCardProps {
  list: List;
  variant?: "hero" | "normal";
}

export const ListCard = memo(function ListCard({ list, variant = "normal" }: ListCardProps) {
  const hero = variant === "hero";
  const { deleteList, setListPinned } = useStoreActions();
  const { openEditList, openConfirm, showToast } = useUi();

  const menu = (
    <div className="absolute right-2.5 top-2.5 z-20">
      <OverflowMenu
        ariaLabel={`Options for ${list.title}`}
        stopPropagation
        items={[
          {
            label: list.pinned ? "Unpin" : "Pin to top",
            onSelect: () => {
              if (!list.pinned) trackProductEvent("feature_used", { feature: "list_pin" });
              setListPinned(list.id, !list.pinned);
              showToast(list.pinned ? "Unpinned" : "Pinned to the top ✨");
            },
          },
          { label: "Edit list", onSelect: () => openEditList(list.id) },
          {
            label: "Delete list",
            tone: "danger",
            onSelect: () =>
              openConfirm({
                title: "Remove this little list?",
                body: "This will delete the list and everything inside it.",
                confirmLabel: "Delete list",
                tone: "danger",
                onConfirm: () => {
                  const handle = deleteList(list.id);
                  showToast("Removed from your little world", {
                    action: { label: "Undo", onAction: handle.undo },
                    onExpire: handle.commit,
                  });
                },
              }),
          },
        ]}
      />
    </div>
  );

  return (
    <motion.div
      layout
      initial={hero ? { rotate: -1 } : false}
      whileHover={{ ...hover, rotate: 0 }}
      whileTap={tap}
      transition={softSpring}
      className={`relative overflow-hidden rounded-2xl shadow-soft ring-1 ring-line/30 ${themeClass(list.theme)}`}
      style={{ background: "var(--t-bg)" }}
    >
      {/* faint corner sticker, tucked like scrapbook tape */}
      <Sticker
        name={TEMPLATE_META[list.template].sticker}
        size={hero ? 64 : 44}
        className="pointer-events-none absolute -right-3 -top-2 opacity-25"
        rotate={12}
      />

      {hero ? (
        <div className="relative flex items-end justify-between gap-3 p-5">
          <div className="min-w-0 flex-1">
            <StickerBadge emoji={list.emoji} size={52} rounded="rounded-xl" />
            <h2 className="mt-3 line-clamp-2 font-display text-[1.65rem] font-semibold leading-[1.1] text-[var(--t-ink)]">
              {/* stretched link: covers the whole card via ::after, so the ⋯ menu
                  (a sibling, not a descendant) stays valid, separately-focusable HTML */}
              <Link href={`/app/list/${list.id}`} className={focusRingStretched}>
                {list.title}
              </Link>
            </h2>
            <p className="mt-1 text-[0.9rem] font-semibold text-brown">{listCountLabel(list)}</p>
          </div>
          <div className="shrink-0 pb-1">
            <CardStack items={list.items} kind={list.kind} size="lg" />
          </div>
        </div>
      ) : (
        <div className="relative p-4">
          <StickerBadge emoji={list.emoji} size={46} rounded="rounded-xl" />
          {/* the ⋯ menu sits beside the badge, above where the title starts, so
              the title can run the full card width */}
          <h2 className="mt-3 line-clamp-2 font-display text-[1.3rem] font-semibold leading-[1.15] text-[var(--t-ink)]">
            <Link href={`/app/list/${list.id}`} className={focusRingStretched}>
              {list.title}
            </Link>
          </h2>
          <p className="mt-0.5 text-[0.82rem] font-semibold text-brown">{listCountLabel(list)}</p>
          {/* the peek is the card's subject now: a full row of covers under the title */}
          <div className="mt-3">
            <CardStack items={list.items.slice(0, 3)} kind={list.kind} size="md" />
          </div>
        </div>
      )}
      {/* menu renders after the link in source order, so keyboard/SR users reach the
          card link before its menu button (a11y, not a layout-affecting z-20 overlay) */}
      {menu}
    </motion.div>
  );
});

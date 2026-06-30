"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { List } from "@/lib/types";
import { TEMPLATE_META } from "@/lib/types";
import { listCountLabel, themeClass } from "@/lib/visual";
import { hover, softSpring, tap } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRing } from "@/lib/a11y";
import { CardStack } from "./card-stack";
import { Sticker } from "./sticker";
import { ViewIcon } from "./view-toggle";
import { OverflowMenu } from "./overflow-menu";

function EmojiTile({ emoji, size = 46 }: { emoji: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-paper shadow-soft"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {emoji}
    </span>
  );
}

/** template label + the list's default-view glyph, the "what kind of world is this" line */
function ListMeta({ list, size = "normal" }: { list: List; size?: "hero" | "normal" }) {
  const meta = TEMPLATE_META[list.template];
  const view = list.defaultView ?? meta.defaultView;
  return (
    <div className={`flex items-center gap-1.5 ${size === "hero" ? "mt-2" : "mt-1.5"}`}>
      <span
        className="rounded-pill px-2 py-0.5 text-[0.68rem] font-bold text-[var(--t-ink)]"
        style={{ background: "var(--t-wash)" }}
      >
        {meta.label}
      </span>
      <span className="text-[var(--t-ink)] opacity-70" title={`${view} view`}>
        <ViewIcon mode={view} size={13} />
      </span>
    </div>
  );
}

export function ListCard({ list, variant = "normal" }: { list: List; variant?: "hero" | "normal" }) {
  const hero = variant === "hero";
  const { deleteList } = useStore();
  const { openEditList, openConfirm, showToast } = useUi();

  const menu = (
    <div className="absolute right-2.5 top-2.5 z-20">
      <OverflowMenu
        ariaLabel={`Options for ${list.title}`}
        stopPropagation
        items={[
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
                  deleteList(list.id);
                  showToast("Removed from your little world");
                },
              }),
          },
        ]}
      />
    </div>
  );

  return (
    <Link href={`/list/${list.id}`} className={`block rounded-2xl ${themeClass(list.theme)} ${focusRing}`}>
      <motion.div
        layout
        initial={hero ? { rotate: -1 } : false}
        whileHover={{ ...hover, rotate: 0 }}
        whileTap={tap}
        transition={softSpring}
        className="relative overflow-hidden rounded-2xl shadow-soft ring-1 ring-line/30"
        style={{ background: "var(--t-bg)" }}
      >
        {menu}
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
              <EmojiTile emoji={list.emoji} size={52} />
              <h2 className="mt-3 font-display text-[1.4rem] font-semibold leading-[1.12] text-[var(--t-ink)]">
                {list.title}
              </h2>
              <p className="mt-1 text-[0.9rem] font-semibold text-brown">{listCountLabel(list)}</p>
              <ListMeta list={list} size="hero" />
            </div>
            <div className="shrink-0 pb-1">
              <CardStack items={list.items} kind={list.kind} size="lg" />
            </div>
          </div>
        ) : (
          <div className="relative p-4">
            <div className="flex items-start justify-between gap-2">
              <EmojiTile emoji={list.emoji} />
              <div className="pt-0.5">
                <CardStack items={list.items.slice(0, 3)} kind={list.kind} size="sm" />
              </div>
            </div>
            <h2 className="mt-3 font-display text-[1.12rem] font-semibold leading-tight text-[var(--t-ink)]">
              {list.title}
            </h2>
            <p className="mt-0.5 text-[0.82rem] font-semibold text-brown">{listCountLabel(list)}</p>
            <ListMeta list={list} />
          </div>
        )}
      </motion.div>
    </Link>
  );
}

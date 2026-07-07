"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import type { Item } from "@/lib/types";
import { ITEM_TYPE_META } from "@/lib/types";
import { PlaceholderPoster } from "./placeholder-poster";

const ASPECT_CLASS: Record<"poster" | "square", string> = {
  poster: "aspect-[2/3]",
  square: "aspect-square",
};

/** A real poster/cover/album-art image, falling back to the designed placeholder. */
export function Cover({
  item,
  badge,
  rounded = "rounded-xl",
  className = "",
  sizes = "(max-width: 640px) 50vw, 25vw",
}: {
  item: Item;
  badge?: ReactNode;
  rounded?: string;
  className?: string;
  /** next/image sizes hint — pass a small value for thumbnails so we don't over-fetch */
  sizes?: string;
}) {
  const [errored, setErrored] = useState(false);
  const seed = item.seed || item.title;
  const shape = ITEM_TYPE_META[item.type].aspect === "square" ? "square" : "poster";

  if (!item.imageUrl || errored) {
    return (
      <PlaceholderPoster
        seed={seed}
        title={item.title}
        badge={badge}
        aspect={shape}
        rounded={rounded}
        className={className}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden bg-cream-deep ${ASPECT_CLASS[shape]} ${rounded} ${className}`}>
      <Image
        src={item.imageUrl}
        alt={item.title}
        fill
        sizes={sizes}
        className="object-cover"
        loading="lazy"
        // local first-party .svg art (the landing preview covers) skips the
        // optimizer, which refuses SVG by default
        unoptimized={item.imageUrl.endsWith(".svg")}
        onError={() => setErrored(true)}
      />
      <span className={`pointer-events-none absolute inset-0 ${rounded} ring-1 ring-inset ring-line/40`} />
      {badge && (
        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-paper/85 text-[0.95rem] shadow-soft backdrop-blur-[1px]">
          {badge}
        </span>
      )}
    </div>
  );
}

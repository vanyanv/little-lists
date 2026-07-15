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
  const [loaded, setLoaded] = useState(false);
  const seed = item.seed || item.title;
  const shape = ITEM_TYPE_META[item.type].aspect === "square" ? "square" : "poster";
  const fallbackEmoji = item.emoji || ITEM_TYPE_META[item.type].emoji;

  if (!item.imageUrl || errored) {
    return (
      <PlaceholderPoster
        seed={seed}
        emoji={fallbackEmoji}
        badge={badge}
        aspect={shape}
        rounded={rounded}
        className={className}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden bg-cream-deep ${ASPECT_CLASS[shape]} ${rounded} ${className}`}>
      {/* the placeholder stays underneath so the real art can fade in over it */}
      <PlaceholderPoster
        seed={seed}
        emoji={fallbackEmoji}
        aspect={shape}
        rounded={rounded}
        className="absolute inset-0 h-full w-full"
      />
      <Image
        src={item.imageUrl}
        alt={item.title}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-200 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        // local first-party .svg art (the landing preview covers) skips the
        // optimizer, which refuses SVG by default
        unoptimized={item.imageUrl.endsWith(".svg")}
        onLoad={() => setLoaded(true)}
        // cached images can finish before hydration attaches onLoad — the ref
        // callback runs post-commit and catches that case
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true);
        }}
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

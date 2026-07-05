import type { CSSProperties } from "react";
import { LittleIcon } from "./icons/little-icon";
import type { StickerName } from "./icons/glyphs";

export type { StickerName } from "./icons/glyphs";

interface StickerProps {
  name: StickerName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
}

/** @deprecated Thin shim over the icons registry — use `LittleIcon` from `components/icons`. */
export function Sticker(props: StickerProps) {
  return <LittleIcon variant="plain" {...props} />;
}

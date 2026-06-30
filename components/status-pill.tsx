import type { CSSProperties } from "react";
import { STATUS_META, type StatusId, type StatusTone } from "@/lib/types";
import { focusRing } from "@/lib/a11y";

const TONE: Record<StatusTone, { bg: string; fg: string; glyph: string }> = {
  good: { bg: "oklch(0.93 0.04 145)", fg: "oklch(0.42 0.07 150)", glyph: "✓" },
  bad: { bg: "oklch(0.93 0.035 42)", fg: "oklch(0.47 0.06 42)", glyph: "✕" },
  love: { bg: "oklch(0.93 0.05 18)", fg: "oklch(0.46 0.1 20)", glyph: "♥" },
  neutral: { bg: "oklch(0.93 0.03 248)", fg: "oklch(0.46 0.075 255)", glyph: "○" },
};

interface StatusPillProps {
  status: StatusId;
  size?: "sm" | "md";
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function StatusPill({ status, size = "sm", onClick, className = "", style }: StatusPillProps) {
  const meta = STATUS_META[status];
  const tone = TONE[meta.tone];
  const pad = size === "md" ? "px-3 py-1.5 text-[0.8rem]" : "px-2.5 py-1 text-[0.72rem]";
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-pill font-semibold leading-none whitespace-nowrap ${pad} ${
        onClick ? `transition-transform active:scale-95 ${focusRing}` : ""
      } ${className}`}
      style={{ background: tone.bg, color: tone.fg, ...style }}
    >
      <span aria-hidden className="text-[0.7em] opacity-80">
        {tone.glyph}
      </span>
      {meta.label}
    </Comp>
  );
}

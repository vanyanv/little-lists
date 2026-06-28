import { initialOf, posterGradient, posterInk } from "@/lib/visual";

interface PlaceholderPosterProps {
  seed: string;
  title: string;
  /** small accent shown in the corner (emoji) */
  badge?: string;
  aspect?: "poster" | "square" | "wide";
  rounded?: string;
  className?: string;
}

const ASPECT: Record<NonNullable<PlaceholderPosterProps["aspect"]>, string> = {
  poster: "aspect-[2/3]",
  square: "aspect-square",
  wide: "aspect-[4/3]",
};

/** A designed, offline "cover": muted duotone, a soft monogram, framed like a poster. */
export function PlaceholderPoster({
  seed,
  title,
  badge,
  aspect = "poster",
  rounded = "rounded-xl",
  className = "",
}: PlaceholderPosterProps) {
  const ink = posterInk(seed);
  return (
    <div
      className={`relative overflow-hidden ${ASPECT[aspect]} ${rounded} ${className}`}
      style={{ ...posterGradient(seed), containerType: "inline-size" }}
    >
      {/* soft key light, gives the flat duotone some depth */}
      <span
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 75% at 26% 12%, oklch(1 0 0 / 0.22), transparent 60%)",
        }}
      />
      {/* centered serif monogram, the "key art" */}
      <span className="absolute inset-0 grid place-items-center">
        <span
          className="font-display font-semibold italic leading-none"
          style={{
            fontSize: "clamp(2.4rem, 56cqw, 9rem)",
            color: ink,
            opacity: 0.5,
            textShadow: "0 2px 10px oklch(0.3 0.04 60 / 0.18)",
          }}
        >
          {initialOf(title)}
        </span>
      </span>
      {/* grounding shadow at the foot, like a poster title block */}
      <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/20 via-black/5 to-transparent" />
      {/* poster frame / matte */}
      <span className={`pointer-events-none absolute inset-0 ${rounded} ring-1 ring-inset ring-white/15`} />
      {badge && (
        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-paper/85 text-[0.95rem] shadow-soft backdrop-blur-[1px]">
          {badge}
        </span>
      )}
    </div>
  );
}

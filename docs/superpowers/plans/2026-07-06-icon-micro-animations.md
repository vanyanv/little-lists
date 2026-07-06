# Icon Micro-Animations + CategoryIcon API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each hand-drawn category glyph an icon-specific interaction micro-animation, and upgrade `CategoryIcon` with size tokens, variants, and an accessibility label.

**Architecture:** Art stays in the static, server-safe `GLYPH_ART` registry (`components/icons/glyphs.tsx`); glyphs whose animation moves a sub-part export their shapes as named constants so static and animated renders share the same paths. Motion *data* lives in a new plain-data registry (`glyph-motion.ts`, node-testable); the only new client component is `AnimatedCategoryIcon`, which plays a glyph's character move once when its `play` prop flips true.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, `motion/react` (Framer Motion), Tailwind v4, Vitest 4 (node environment — data-level tests only, no jsdom).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-icon-micro-animations-design.md`.
- This is a breaking-changes Next.js version — consult `node_modules/next/dist/docs/` if touching routing/RSC behavior (this plan doesn't).
- `components/icons/glyphs.tsx` must stay server-safe: no `"use client"`, no `motion/react` imports.
- No ambient/looping animation anywhere in this plan; animations fire only on interaction (`play` flipping true) and must respect `useReducedMotion()`.
- Size tokens: `sm` = 14, `md` = 18, `lg` = 22 (px). Numeric `size` keeps working everywhere.
- All existing call sites must keep compiling without edits (back-compatible props).
- Tests: `npx vitest run` (or `npm test`). Type/render safety: `npx tsc --noEmit` and `npm run build`.
- Commit after every task. Do not commit `.playwright-mcp/` (pre-existing untracked dir).

---

### Task 1: Clapperboard glyph + movie remap

The movie category currently renders the `film` strip. Draw a `clapperboard` glyph (body + lid as separate exported constants — the lid is what animates later) and point `movie`/`movies` at it. `film` stays: `TEMPLATE_META.movie.sticker` still uses it as a decorative corner sticker.

**Files:**
- Modify: `lib/icons.test.ts`
- Modify: `components/icons/glyphs.tsx`
- Modify: `components/icons/category-icon.tsx:9-10`

**Interfaces:**
- Produces: `GlyphName` union gains `"clapperboard"`; exports `CLAPPER_BODY: React.ReactNode` and `CLAPPER_LID: React.ReactNode` from `glyphs.tsx`; `CATEGORY_GLYPH.movie === "clapperboard"`.

- [ ] **Step 1: Write the failing test**

Append to `lib/icons.test.ts` (inside the existing `describe("CATEGORY_GLYPH", ...)` block):

```ts
  it("movie renders the clapperboard, not the decorative film strip", () => {
    expect(CATEGORY_GLYPH.movie).toBe("clapperboard");
    expect(CATEGORY_GLYPH.movies).toBe("clapperboard");
    expect(GLYPH_ART.clapperboard).toBeDefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/icons.test.ts`
Expected: FAIL — `expected 'film' to be 'clapperboard'` (and a TS error on `GLYPH_ART.clapperboard` is fine at this point).

- [ ] **Step 3: Add the glyph**

In `components/icons/glyphs.tsx`:

1. Add to the `GlyphName` union, in the pictorial group (after `"pencil"`):

```ts
  | "clapperboard"
```

2. Below the `HEART_PATH` constant, add the shared shape constants (exported — the animated renderer reuses them):

```tsx
/* clapperboard — lid is separate so AnimatedCategoryIcon can clap it */
export const CLAPPER_LID = (
  <g>
    <rect x="3" y="4.4" width="18" height="4.4" rx="1.4" fill="oklch(0.7 0.065 300)" />
    {[5.4, 9.6, 13.8, 18].map((x) => (
      <path key={x} d={`M${x} 4.4l2.2 4.4h1.7l-2.2-4.4z`} fill="oklch(0.96 0.02 300)" opacity="0.85" />
    ))}
  </g>
);
export const CLAPPER_BODY = (
  <g>
    <rect x="3" y="9.4" width="18" height="11" rx="1.8" fill="oklch(0.84 0.058 300)" />
    <rect x="6.2" y="13.2" width="11.6" height="1.7" rx="0.85" fill="oklch(0.96 0.02 300)" opacity="0.9" />
  </g>
);
```

3. Add the registry entry in `GLYPH_ART` (after `pencil`, body first so the lid sits on top):

```tsx
  clapperboard: (
    <g>
      {CLAPPER_BODY}
      {CLAPPER_LID}
    </g>
  ),
```

4. In `components/icons/category-icon.tsx`, change the two movie mappings:

```ts
  movie: "clapperboard",
  movies: "clapperboard",
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/icons.test.ts && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add components/icons/glyphs.tsx components/icons/category-icon.tsx lib/icons.test.ts
git commit -m "feat(icons): draw clapperboard glyph, remap movie category to it"
```

---

### Task 2: Extract sub-part shape constants (book, gift, tulip, ramen)

Pure refactor: the glyphs whose animations move a sub-part get their shapes exported as constants, and `GLYPH_ART` composes those constants. Rendered output must be byte-identical.

**Files:**
- Modify: `components/icons/glyphs.tsx` (the `book`, `gift`, `tulip`, `ramen-bowl` entries)

**Interfaces:**
- Consumes: existing `GLYPH_ART` entries (Task 1 file state).
- Produces: exports `BOOK_LEFT`, `BOOK_RIGHT`, `BOOK_SPINE`, `GIFT_BOX`, `GIFT_BOW`, `TULIP_STEM`, `TULIP_BLOOM`, `RAMEN_BODY`, `RAMEN_STEAM` (all `React.ReactNode`) from `glyphs.tsx`.

- [ ] **Step 1: Extract the constants**

In `components/icons/glyphs.tsx`, next to `CLAPPER_LID`/`CLAPPER_BODY`, add (shape data copied verbatim from the current `GLYPH_ART` entries):

```tsx
/* book — halves are separate so the book can open slightly */
export const BOOK_LEFT = (
  <path d="M4 5.2c2.6-1 5.4-1 8 0v14c-2.6-1-5.4-1-8 0z" fill="oklch(0.85 0.045 145)" />
);
export const BOOK_RIGHT = (
  <path d="M20 5.2c-2.6-1-5.4-1-8 0v14c2.6-1 5.4-1 8 0z" fill="oklch(0.8 0.05 145)" />
);
export const BOOK_SPINE = <path d="M12 5.2v14" stroke="oklch(0.65 0.05 145)" strokeWidth="0.8" />;

/* gift — bow is separate so it can pop */
export const GIFT_BOX = (
  <g>
    <rect x="4.5" y="10.2" width="15" height="10.3" rx="1.6" fill="oklch(0.86 0.052 18)" />
    <rect x="3.5" y="6.9" width="17" height="4.2" rx="1.4" fill="oklch(0.9 0.045 18)" />
    <rect x="10.9" y="6.9" width="2.2" height="13.6" fill="oklch(0.97 0.015 18)" />
  </g>
);
export const GIFT_BOW = (
  <path
    d="M12 6.6C10.8 4.1 7.9 3.2 7.3 4.8c-.6 1.5 1.6 2.3 4.7 1.8zM12 6.6c1.2-2.5 4.1-3.4 4.7-1.8.6 1.5-1.6 2.3-4.7 1.8z"
    fill="oklch(0.8 0.07 18)"
  />
);

/* tulip — bloom is separate so it can bloom from the stem */
export const TULIP_STEM = (
  <g>
    <path d="M12 14.5v6" stroke="oklch(0.68 0.06 145)" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M11.6 19.4c-2.8.3-4.7-.8-5.7-2.9 2.7-.6 4.7.3 5.7 2.9z" fill="oklch(0.82 0.05 145)" />
  </g>
);
export const TULIP_BLOOM = (
  <path
    d="M6.5 4.6l2.8 2.7L12 4.2l2.7 3.1 2.8-2.7v4.7c0 3.4-2.2 5.5-5.5 5.5s-5.5-2.1-5.5-5.5z"
    fill="oklch(0.84 0.075 350)"
  />
);

/* ramen — steam is separate so it can rise */
export const RAMEN_STEAM = (
  <path
    d="M9.3 2.8c-.7 1 .7 1.7 0 2.7M14.7 2.8c-.7 1 .7 1.7 0 2.7"
    fill="none"
    stroke="oklch(0.8 0.04 248)"
    strokeWidth="1.3"
    strokeLinecap="round"
  />
);
export const RAMEN_BODY = (
  <g>
    <path d="M3.5 10.5h17a8.5 8.5 0 0 1-17 0z" fill="oklch(0.84 0.05 248)" />
    <path d="M6.2 14h11.6" stroke="oklch(0.96 0.015 248)" strokeWidth="1.4" strokeLinecap="round" />
    <rect x="9" y="18.6" width="6" height="2" rx="1" fill="oklch(0.78 0.05 248)" />
  </g>
);
```

Then replace the four `GLYPH_ART` entries so they compose the constants:

```tsx
  book: (
    <g>
      {BOOK_LEFT}
      {BOOK_RIGHT}
      {BOOK_SPINE}
    </g>
  ),
```

```tsx
  gift: (
    <g>
      {GIFT_BOX}
      {GIFT_BOW}
    </g>
  ),
```

```tsx
  tulip: (
    <g>
      {TULIP_STEM}
      {TULIP_BLOOM}
    </g>
  ),
```

```tsx
  "ramen-bowl": (
    <g>
      {RAMEN_STEAM}
      {RAMEN_BODY}
    </g>
  ),
```

- [ ] **Step 2: Verify tests stay green and types hold**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS (this is a refactor — no behavior change).

- [ ] **Step 3: Commit**

```bash
git add components/icons/glyphs.tsx
git commit -m "refactor(icons): export sub-part shape constants for animatable glyphs"
```

---

### Task 3: CategoryIcon API — size tokens, variants, ariaLabel

Upgrade `CategoryIcon` back-compatibly. Variants delegate to `LittleIcon`, which already implements the badge tile and die-cut sticker treatments — don't duplicate them.

**Files:**
- Modify: `lib/icons.test.ts`
- Modify: `components/icons/category-icon.tsx`

**Interfaces:**
- Consumes: `LittleIcon` from `./little-icon` (existing: `{ name, size, variant: "plain" | "badge" | "sticker", className }`).
- Produces from `category-icon.tsx`:
  - `CATEGORY_SIZE: { sm: 14; md: 18; lg: 22 }`
  - `type CategoryIconSize = "sm" | "md" | "lg" | number`
  - `resolveCategorySize(size: CategoryIconSize): number`
  - `CategoryIcon` props: `{ id: string; size?: CategoryIconSize; variant?: "plain" | "badge" | "sticker"; className?: string; ariaLabel?: string }`

- [ ] **Step 1: Write the failing test**

Append a new describe block to `lib/icons.test.ts`:

```ts
import { CATEGORY_SIZE, resolveCategorySize } from "@/components/icons/category-icon";

describe("CATEGORY_SIZE", () => {
  it("matches the design tokens", () => {
    expect(CATEGORY_SIZE).toEqual({ sm: 14, md: 18, lg: 22 });
  });

  it("resolves tokens and passes numbers through", () => {
    expect(resolveCategorySize("sm")).toBe(14);
    expect(resolveCategorySize("lg")).toBe(22);
    expect(resolveCategorySize(16)).toBe(16);
  });
});
```

(Put the `import` at the top of the file with the other imports.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/icons.test.ts`
Expected: FAIL — `CATEGORY_SIZE`/`resolveCategorySize` are not exported.

- [ ] **Step 3: Implement**

Replace the props/component half of `components/icons/category-icon.tsx` (keep `CATEGORY_GLYPH` as-is) with:

```tsx
import { GlyphSvg, type GlyphName } from "./glyphs";
import { LittleIcon } from "./little-icon";

// ... CATEGORY_GLYPH stays here unchanged ...

export const CATEGORY_SIZE = { sm: 14, md: 18, lg: 22 } as const;
export type CategoryIconSize = keyof typeof CATEGORY_SIZE | number;

export function resolveCategorySize(size: CategoryIconSize): number {
  return typeof size === "number" ? size : CATEGORY_SIZE[size];
}

interface CategoryIconProps {
  id: string;
  size?: CategoryIconSize;
  /** plain = bare svg (default) · badge = soft paper tile · sticker = die-cut tilt */
  variant?: "plain" | "badge" | "sticker";
  className?: string;
  /** when set, the icon is announced (role="img"); otherwise it stays decorative */
  ariaLabel?: string;
}

/** A category id rendered as its house glyph (unknown ids fall back to a sparkle). */
export function CategoryIcon({
  id,
  size = "md",
  variant = "plain",
  className,
  ariaLabel,
}: CategoryIconProps) {
  const px = resolveCategorySize(size);
  const name: GlyphName = CATEGORY_GLYPH[id] ?? "sparkle";
  const icon =
    variant === "plain" ? (
      <GlyphSvg name={name} size={px} className={className} />
    ) : (
      <LittleIcon name={name} size={px} variant={variant} className={className} />
    );
  if (!ariaLabel) return icon;
  return (
    <span role="img" aria-label={ariaLabel} className="contents">
      {icon}
    </span>
  );
}
```

Note: every existing call site passes a numeric `size`, so changing the default from `16` to `"md"` (18) affects no one; `npx tsc --noEmit` proves it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add components/icons/category-icon.tsx lib/icons.test.ts
git commit -m "feat(icons): CategoryIcon size tokens, badge/sticker variants, ariaLabel"
```

---

### Task 4: GLYPH_MOTION data registry

Motion *data* lives in a plain `.ts` module with no `motion/react` import, so the node-env vitest suite can guard it the same way it guards `GLYPH_ART`.

**Files:**
- Create: `components/icons/glyph-motion.ts`
- Modify: `lib/icons.test.ts`

**Interfaces:**
- Consumes: `type GlyphName` from `./glyphs`.
- Produces from `glyph-motion.ts`:
  - `WHOLE_MOTION: Partial<Record<GlyphName, { rotate?: number[]; scale?: number[]; y?: number[] }>>`
  - `PART_MOTION_GLYPHS: readonly GlyphName[]` — glyphs animated via sub-parts (`clapperboard`, `book`, `gift`, `tulip`, `ramen-bowl`)
  - `STICKER_POP: { scale: number[] }` — fallback move

- [ ] **Step 1: Write the failing test**

Append to `lib/icons.test.ts`:

```ts
import { PART_MOTION_GLYPHS, WHOLE_MOTION } from "@/components/icons/glyph-motion";

describe("glyph motion registry", () => {
  const partSet = new Set<string>(PART_MOTION_GLYPHS);

  it("part-motion glyphs exist in the art registry", () => {
    for (const g of PART_MOTION_GLYPHS) {
      expect(GLYPH_ART[g], `part glyph "${g}"`).toBeDefined();
    }
  });

  it("whole-motion glyphs exist in the art registry and never overlap part motions", () => {
    for (const g of Object.keys(WHOLE_MOTION)) {
      expect(GLYPH_ART[g as keyof typeof GLYPH_ART], `whole glyph "${g}"`).toBeDefined();
      expect(partSet.has(g), `"${g}" is in both registries`).toBe(false);
    }
  });

  it("every spec'd category has a character move (not just the fallback pop)", () => {
    const specced = ["movie", "book", "food", "place", "gift", "date", "people", "custom", "obsessions", "notes", "music"];
    for (const id of specced) {
      const g = CATEGORY_GLYPH[id];
      const hasMove = partSet.has(g) || WHOLE_MOTION[g] !== undefined;
      expect(hasMove, `category "${id}" (glyph "${g}")`).toBe(true);
    }
  });
});
```

(Imports go at the top of the file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/icons.test.ts`
Expected: FAIL — module `@/components/icons/glyph-motion` does not exist.

- [ ] **Step 3: Create the registry**

Create `components/icons/glyph-motion.ts`:

```ts
import type { GlyphName } from "./glyphs";

/**
 * Motion data for glyph character moves — kept as plain data (no motion/react)
 * so the node-env test suite can guard it like GLYPH_ART.
 *
 * TODO(asset-swap): animated vendor stickers (Lottie / Animated Noto) would
 * replace both registries here — AnimatedCategoryIcon is the only consumer.
 */

/** Whole-icon keyframe moves, played once (~0.5s) when a pick lands. */
export const WHOLE_MOTION: Partial<
  Record<GlyphName, { rotate?: number[]; scale?: number[]; y?: number[] }>
> = {
  fork: { rotate: [0, -9, 7, -4, 0] }, // tiny wiggle
  flower: { scale: [1, 1.16, 0.97, 1] }, // soft pulse
  heart: { scale: [1, 1.16, 0.97, 1] }, // soft pulse
  sparkle: { rotate: [0, 18, -10, 0], scale: [1, 1.14, 0.96, 1] }, // twinkle
  pencil: { rotate: [0, -10, 6, 0] }, // little tilt
  headphones: { y: [0, -1.6, 0, -1, 0] }, // bounce to the beat
};

/** Glyphs whose move animates a sub-part — AnimatedCategoryIcon renders these itself. */
export const PART_MOTION_GLYPHS: readonly GlyphName[] = [
  "clapperboard", // lid claps
  "book", // halves open slightly
  "gift", // bow pops
  "tulip", // bloom blooms
  "ramen-bowl", // steam rises
];

/** Fallback for glyphs with no bespoke move — a gentle sticker pop. */
export const STICKER_POP = { scale: [1, 1.12, 0.97, 1] };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add components/icons/glyph-motion.ts lib/icons.test.ts
git commit -m "feat(icons): motion data registry for glyph character moves"
```

---

### Task 5: AnimatedCategoryIcon component

The one new client component. Plays the glyph's character move once when `play` flips true; sub-part glyphs render their own svg with `motion.g` around the shared shape constants. `initial={false}` everywhere so a picker that opens with a selection doesn't replay on mount.

**Files:**
- Create: `components/icons/animated-category-icon.tsx`
- Modify: `components/icons/little-icon.tsx` (export the halo filter string)
- Modify: `components/icons/index.ts`

**Interfaces:**
- Consumes: shape constants + `GlyphSvg` from `./glyphs` (Tasks 1–2); `CATEGORY_GLYPH`, `resolveCategorySize`, `CategoryIconSize` from `./category-icon` (Task 3); `WHOLE_MOTION`, `PART_MOTION_GLYPHS`, `STICKER_POP` from `./glyph-motion` (Task 4).
- Produces: `AnimatedCategoryIcon` with props `{ id: string; size?: CategoryIconSize; variant?: "plain" | "badge" | "sticker"; play: boolean; className?: string; ariaLabel?: string }`; `STICKER_HALO` string export from `little-icon.tsx`.

- [ ] **Step 1: Export the halo from LittleIcon**

In `components/icons/little-icon.tsx`, lift the inline `halo` constant (lines 42-43) to a module-level export and use it in place:

```tsx
/** die-cut sticker look — a paper-colored halo around the art */
export const STICKER_HALO =
  "drop-shadow(1.5px 0 0 var(--color-paper)) drop-shadow(-1.5px 0 0 var(--color-paper)) drop-shadow(0 1.5px 0 var(--color-paper)) drop-shadow(0 -1.5px 0 var(--color-paper))";
```

(Inside the `variant === "sticker"` branch, replace `const halo = ...` with `style={{ filter: STICKER_HALO, ...style }}`.)

- [ ] **Step 2: Create the component**

Create `components/icons/animated-category-icon.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  GlyphSvg,
  type GlyphName,
  CLAPPER_BODY,
  CLAPPER_LID,
  BOOK_LEFT,
  BOOK_RIGHT,
  BOOK_SPINE,
  GIFT_BOX,
  GIFT_BOW,
  TULIP_STEM,
  TULIP_BLOOM,
  RAMEN_BODY,
  RAMEN_STEAM,
} from "./glyphs";
import {
  CATEGORY_GLYPH,
  resolveCategorySize,
  type CategoryIconSize,
} from "./category-icon";
import { STICKER_HALO } from "./little-icon";
import { STICKER_POP, WHOLE_MOTION } from "./glyph-motion";

const playOnce = { duration: 0.5, ease: "easeInOut" as const };

interface AnimatedCategoryIconProps {
  id: string;
  size?: CategoryIconSize;
  variant?: "plain" | "badge" | "sticker";
  /** flip true when the user picks this category — the character move plays once */
  play: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * CategoryIcon's interactive sibling for pickers: same glyph resolution, plus
 * a per-glyph character move (lid claps, bow pops, bloom blooms…) when `play`
 * lands. Never loops; reduced motion renders fully static.
 */
export function AnimatedCategoryIcon({
  id,
  size = "md",
  variant = "plain",
  play,
  className,
  ariaLabel,
}: AnimatedCategoryIconProps) {
  const reduce = useReducedMotion() ?? false;
  const px = resolveCategorySize(size);
  const name: GlyphName = CATEGORY_GLYPH[id] ?? "sparkle";
  const playing = play && !reduce;
  // badge mirrors LittleIcon: `size` is the tile, the glyph sits at 0.6×
  const glyphPx = variant === "badge" ? Math.round(px * 0.6) : px;

  let core = reduce ? (
    <GlyphSvg name={name} size={glyphPx} />
  ) : (
    <AnimatedGlyph name={name} size={glyphPx} play={playing} />
  );

  if (variant === "badge") {
    core = (
      <span
        className="grid shrink-0 place-items-center rounded-xl bg-paper shadow-soft"
        style={{ width: px, height: px }}
      >
        {core}
      </span>
    );
  } else if (variant === "sticker") {
    core = <span style={{ filter: STICKER_HALO, rotate: "-6deg" }}>{core}</span>;
  }

  return (
    <motion.span
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      className={`inline-flex ${className ?? ""}`}
    >
      {core}
    </motion.span>
  );
}

/** the svg frame every animated glyph shares */
function Frame({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** a sub-part that moves — origin is in the part's own bounding box */
function Part({
  play,
  move,
  origin,
  children,
}: {
  play: boolean;
  move: Record<string, number[]>;
  origin: string;
  children: ReactNode;
}) {
  return (
    <motion.g
      initial={false}
      animate={play ? move : undefined}
      transition={playOnce}
      style={{ transformBox: "fill-box", transformOrigin: origin }}
    >
      {children}
    </motion.g>
  );
}

function AnimatedGlyph({ name, size, play }: { name: GlyphName; size: number; play: boolean }) {
  switch (name) {
    case "clapperboard":
      return (
        <Frame size={size}>
          {CLAPPER_BODY}
          <Part play={play} move={{ rotate: [0, -16, 0, -9, 0] }} origin="0% 100%">
            {CLAPPER_LID}
          </Part>
        </Frame>
      );
    case "book":
      return (
        <Frame size={size}>
          <Part play={play} move={{ rotate: [0, -6, 0], scaleX: [1, 0.94, 1] }} origin="100% 50%">
            {BOOK_LEFT}
          </Part>
          <Part play={play} move={{ rotate: [0, 6, 0], scaleX: [1, 0.94, 1] }} origin="0% 50%">
            {BOOK_RIGHT}
          </Part>
          {BOOK_SPINE}
        </Frame>
      );
    case "gift":
      return (
        <Frame size={size}>
          {GIFT_BOX}
          <Part play={play} move={{ scale: [1, 1.3, 0.95, 1.12, 1] }} origin="50% 100%">
            {GIFT_BOW}
          </Part>
        </Frame>
      );
    case "tulip":
      return (
        <Frame size={size}>
          {TULIP_STEM}
          <Part play={play} move={{ scale: [1, 1.14, 0.98, 1.06, 1] }} origin="50% 100%">
            {TULIP_BLOOM}
          </Part>
        </Frame>
      );
    case "ramen-bowl":
      return (
        <Frame size={size}>
          <Part play={play} move={{ y: [0, -1.8, 0], opacity: [1, 0.35, 1] }} origin="50% 100%">
            {RAMEN_STEAM}
          </Part>
          {RAMEN_BODY}
        </Frame>
      );
    default: {
      const move = WHOLE_MOTION[name] ?? STICKER_POP;
      return (
        <motion.span
          initial={false}
          animate={play ? move : undefined}
          transition={playOnce}
          className="inline-flex"
          style={{ transformOrigin: "50% 60%" }}
        >
          <GlyphSvg name={name} size={size} />
        </motion.span>
      );
    }
  }
}
```

Note on `Part`'s `move` prop type: `{ rotate: [0, -6, 0], scaleX: [1, 0.94, 1] }` and `{ y: ..., opacity: ... }` both satisfy `Record<string, number[]>`. If `motion.g`'s `animate` prop rejects that type under the installed motion version, widen the prop to `TargetAndTransition` from `motion/react` — do not cast at call sites.

- [ ] **Step 3: Export from the barrel**

In `components/icons/index.ts`, add:

```ts
export { AnimatedCategoryIcon } from "./animated-category-icon";
export { WHOLE_MOTION, PART_MOTION_GLYPHS, STICKER_POP } from "./glyph-motion";
```

- [ ] **Step 4: Verify types and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/icons/animated-category-icon.tsx components/icons/little-icon.tsx components/icons/index.ts
git commit -m "feat(icons): AnimatedCategoryIcon plays per-glyph character moves"
```

---

### Task 6: Wire the four interactive pickers

Swap the static `CategoryIcon` for `AnimatedCategoryIcon` with `play` bound to selection — only in the pickers. Display-only surfaces (home chips, person cards, section headers) are untouched.

**Files:**
- Modify: `components/list-form-fields.tsx:148`
- Modify: `components/add-item-modal.tsx:239`
- Modify: `components/add-detail-sheet.tsx:80`
- Modify: `components/onboarding/onboarding-flow.tsx:261`

**Interfaces:**
- Consumes: `AnimatedCategoryIcon` (Task 5). All four files are already `"use client"` components, so a client child is fine.

- [ ] **Step 1: Template picker** (`components/list-form-fields.tsx`)

Replace the import `import { CategoryIcon } from "./icons/category-icon";` with:

```tsx
import { AnimatedCategoryIcon } from "./icons/animated-category-icon";
```

and inside the template button (line ~148), replace `<CategoryIcon id={t} size={18} />` with:

```tsx
<AnimatedCategoryIcon id={t} size={18} play={active} />
```

- [ ] **Step 2: Add-item type chips** (`components/add-item-modal.tsx`)

Same import swap (this file imports from `"./icons/category-icon"` at line 25). Replace `<CategoryIcon id={t} size={15} />` (line ~239) with:

```tsx
<AnimatedCategoryIcon id={t} size={15} play={active} />
```

- [ ] **Step 3: Add-detail section picker** (`components/add-detail-sheet.tsx`)

Same import swap (line 11). Replace `<CategoryIcon id={s.id} size={14} />` (line ~80) with:

```tsx
<AnimatedCategoryIcon id={s.id} size={14} play={s.id === sectionId} />
```

- [ ] **Step 4: Onboarding starter picks** (`components/onboarding/onboarding-flow.tsx`)

Same import swap. In `StarterCard` (line ~261), replace `<CategoryIcon id={id} size={22} />` with:

```tsx
<AnimatedCategoryIcon id={id} size={22} play={selected} />
```

If a file still uses `CategoryIcon` elsewhere after the swap, keep both imports; if not, drop the unused one (lint will flag it).

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean.

Then verify visually per the project's `verify` skill (dev server): open the create-list sheet, tap through templates — each pick plays its character move once (clapperboard claps, bow pops, bloom blooms); already-selected chips don't loop. With OS reduced-motion enabled, no movement at all.

- [ ] **Step 6: Commit**

```bash
git add components/list-form-fields.tsx components/add-item-modal.tsx components/add-detail-sheet.tsx components/onboarding/onboarding-flow.tsx
git commit -m "feat(icons): pickers play glyph character moves on selection"
```

---

### Task 7: Docs + final verification

**Files:**
- Modify: `docs/ASSETS.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Document the motion layer**

In `docs/ASSETS.md`, add a section after "Drawing rules":

```markdown
## Motion rules

Category glyphs get a single "character move" that plays once when a pick
lands in an interactive picker (template picker, add-item type chips,
add-detail sections, onboarding starters) — never ambiently.

- Motion *data* lives in `components/icons/glyph-motion.ts` (plain data, no
  motion imports, guarded by `lib/icons.test.ts`).
- `AnimatedCategoryIcon` is the only renderer. Whole-icon moves wrap the
  static `GlyphSvg`; sub-part moves (clapperboard lid, book halves, gift
  bow, tulip bloom, ramen steam) re-render the glyph from the shape
  constants exported by `glyphs.tsx`, so static and animated art share the
  same paths.
- `useReducedMotion()` disables everything; display-only surfaces (home
  chips, person cards, section headers, status pills) stay static.
```

Also append this line to the "Swapping in third-party assets later" section:

```markdown
- Animated vendor stickers (Lottie / Animated Noto) would replace
  `glyph-motion.ts` and `AnimatedCategoryIcon`'s renderers — nothing else
  consumes the motion layer.
```

- [ ] **Step 2: Full verification**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: everything green.

- [ ] **Step 3: Commit**

```bash
git add docs/ASSETS.md
git commit -m "docs: motion rules for the glyph character moves"
```

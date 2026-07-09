# Landing Page Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the rest of the landing page up to the new showcase's bar: fix the two people-content collisions, replace the flat "See it your way" rows with an interactive Grid/List/Cozy morphing demo, and add small polish to hero, privacy, and final CTA.

**Architecture:** All changes are in `components/landing/*` plus two small `lib/` additions. The view-modes demo reuses the app's real `ViewToggle` segmented control and animates the same four poster items between arrangements with Motion `layout` animations; an idle timer auto-cycles modes using the same `useInView`-gated interval pattern as `app-preview.tsx`.

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 (CSS-first tokens in `app/globals.css`), `motion` v12 (`motion/react`), Vitest (node env, `lib/**` only).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-08-landing-page-improvements-design.md`.
- Do NOT touch `components/landing/use-cases.tsx` (just shipped) except as committed in Task 1 Step 1.
- Reduced-motion idiom everywhere: `const reduce = useReducedMotion() ?? false;` and gate every animation on it. JS loops (`setInterval`, `gentleFloat`) MUST be `reduce`-guarded — the global CSS rule does not cover them.
- Repo lint has 4 pre-existing findings (`add-item-modal.tsx`, `overflow-menu.tsx`, `layout.tsx`); do not chase them, do not add new ones.
- The working tree starts with uncommitted showcase changes (`app/page.tsx`, `components/landing/use-cases.tsx`, `lib/landing-art.ts`, `lib/landing-data.ts`, `lib/motion.ts`) — Task 1 Step 1 commits them first so later per-file commits stay clean.
- New copy is exact as written in this plan; do not improvise wording.

---

### Task 1: Commit pending showcase work, then fix the people collisions

**Files:**
- Modify: `lib/landing-data.ts` (SHOWCASE_PEOPLE_SCRAPS entry)
- Modify: `components/landing/people-memory.tsx:27-29` (H2 text)
- Test: `lib/landing-data.test.ts` (create)

**Interfaces:**
- Consumes: `SHOWCASE_PEOPLE_SCRAPS: string[]` and `PREVIEW_PERSON: Person` from `lib/landing-data.ts`.
- Produces: nothing new — content-only changes.

- [ ] **Step 1: Commit the pending showcase changes as their own commit**

```bash
git add app/page.tsx components/landing/use-cases.tsx lib/landing-art.ts lib/landing-data.ts lib/motion.ts
git commit -m "feat(landing): redesign use-cases into scrapbook showcase with real posters

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected: clean commit; `git status` afterwards shows no modified tracked files.

- [ ] **Step 2: Write the failing regression test**

Create `lib/landing-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PREVIEW_PERSON, SHOWCASE_PEOPLE_SCRAPS } from "./landing-data";

describe("landing sample copy", () => {
  it("keeps the showcase people scraps distinct from the person card's chips", () => {
    const chips = new Set(PREVIEW_PERSON.sections.map((s) => s.label.toLowerCase()));
    for (const scrap of SHOWCASE_PEOPLE_SCRAPS) {
      expect(chips.has(scrap.toLowerCase()), `"${scrap}" also appears on the person card`).toBe(false);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/landing-data.test.ts`
Expected: FAIL — `"no mushrooms, ever" also appears on the person card`.

- [ ] **Step 4: Fix the duplicate chip**

In `lib/landing-data.ts`, inside `SHOWCASE_PEOPLE_SCRAPS`, replace the line

```ts
  "no mushrooms, ever",
```

with

```ts
  "her ring size, just in case",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/landing-data.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Retitle the PeopleMemory section**

In `components/landing/people-memory.tsx`, the H2 currently reads:

```tsx
            Remember the little things about people
```

Replace that text node with:

```tsx
            Every person gets their own little page
```

(Attributes and surrounding markup unchanged; body copy below it unchanged.)

- [ ] **Step 7: Full test suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass (81 total — 80 existing + 1 new), tsc silent.

- [ ] **Step 8: Commit**

```bash
git add lib/landing-data.ts lib/landing-data.test.ts components/landing/people-memory.tsx
git commit -m "fix(landing): de-duplicate people teaser chip and section heading

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `nextViewMode` helper in `lib/visual.ts`

**Files:**
- Modify: `lib/visual.ts` (append)
- Test: `lib/visual.test.ts` (append)

**Interfaces:**
- Consumes: `ViewMode` type from `lib/types.ts` (`"grid" | "list" | "cozy"`).
- Produces: `export function nextViewMode(mode: ViewMode): ViewMode` — Task 3 imports this for the idle cycle.

- [ ] **Step 1: Write the failing test**

Append to `lib/visual.test.ts`:

```ts
describe("nextViewMode", () => {
  it("cycles grid → list → cozy → grid", () => {
    expect(nextViewMode("grid")).toBe("list");
    expect(nextViewMode("list")).toBe("cozy");
    expect(nextViewMode("cozy")).toBe("grid");
  });
});
```

Add `nextViewMode` to the existing import from `./visual` at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/visual.test.ts`
Expected: FAIL — `nextViewMode` is not exported.

- [ ] **Step 3: Implement**

Append to `lib/visual.ts` (add `import type { ViewMode } from "./types";` to the type imports at the top if `ViewMode` isn't already imported):

```ts
// the landing demo's idle cycle walks the app's three browsing views in order
const VIEW_MODE_ORDER: ViewMode[] = ["grid", "list", "cozy"];

export function nextViewMode(mode: ViewMode): ViewMode {
  const i = VIEW_MODE_ORDER.indexOf(mode);
  return VIEW_MODE_ORDER[(i + 1) % VIEW_MODE_ORDER.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/visual.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/visual.ts lib/visual.test.ts
git commit -m "feat(landing): add nextViewMode cycle helper

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Rewrite "See it your way" as the interactive toggle demo

**Files:**
- Modify: `components/landing/view-modes.tsx` (full rewrite)

**Interfaces:**
- Consumes: `ViewToggle { value: ViewMode; onChange: (v: ViewMode) => void }` from `components/view-toggle.tsx`; `nextViewMode` from `lib/visual.ts` (Task 2); `softSpring`, `fadeSlide`, `inViewOnce` from `lib/motion.ts`.
- Produces: `export function ViewModes(): JSX.Element` — same export name/signature `app/page.tsx` already renders; no page change needed.

Notes for the implementer:
- `ViewToggle` renders real `<button>`s with `aria-pressed`, focus rings, and an animated active pill (`layoutId="view-pill"`) — do not rebuild it.
- Motion `layout` props animate position/size changes caused by className swaps as long as element identity persists — that is why `DemoItem` renders ONE stable tree for all modes (same key, conditional extras) instead of three different trees.
- `Date.now()` is fine here (component code, not a Workflow script).

- [ ] **Step 1: Replace the file contents**

Replace `components/landing/view-modes.tsx` entirely with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { ViewMode } from "@/lib/types";
import { ViewToggle } from "@/components/view-toggle";
import { nextViewMode } from "@/lib/visual";
import { softSpring, fadeSlide, inViewOnce } from "@/lib/motion";

/* One little movie list, rearranged live: the visitor (or an idle timer) flips
   between the app's three browsing views and the same posters morph between
   arrangements — proof, not description. First-party drawn art on purpose. */

const SAMPLE = [
  { poster: "/posters/past-lives.svg", title: "Past Lives", theme: "blush" },
  { poster: "/posters/paddington.svg", title: "Paddington", theme: "sage" },
  { poster: "/posters/spirited-away.svg", title: "Spirited Away", theme: "butter" },
  { poster: "/posters/lady-bird.svg", title: "Lady Bird", theme: "sky" },
] as const;

type Sample = (typeof SAMPLE)[number];

const TITLES: Record<ViewMode, string> = { grid: "Grid", list: "List", cozy: "Cozy" };

const LINES: Record<ViewMode, string> = {
  grid: "For covers, posters, and pretty browsing.",
  list: "For scrolling through a lot fast.",
  cozy: "For thoughts, opinions, and anything freeform.",
};

const CYCLE_MS = 3500;
// a manual pick holds the idle cycle long enough to actually look
const MANUAL_PAUSE_MS = 8000;

function DemoItem({ s, mode, reduce }: { s: Sample; mode: ViewMode; reduce: boolean }) {
  const spring = reduce ? { duration: 0 } : softSpring;
  return (
    <motion.div
      layout={!reduce}
      transition={spring}
      className={
        mode === "grid"
          ? "min-w-0"
          : "flex min-w-0 items-center gap-2.5 rounded-lg bg-cream/80 px-2.5 py-2 ring-1 ring-line/30"
      }
    >
      <motion.span
        layout={!reduce}
        transition={spring}
        className={`relative block shrink-0 overflow-hidden ${
          mode === "grid" ? "aspect-square w-full rounded-lg shadow-soft" : "h-9 w-9 self-start rounded-md"
        }`}
      >
        <Image src={s.poster} alt={s.title} fill sizes="150px" unoptimized className="object-cover" />
      </motion.span>
      {mode !== "grid" && (
        <motion.span
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.12 }}
          className="min-w-0 flex-1"
        >
          <span className="block truncate text-[0.82rem] font-semibold text-ink">{s.title}</span>
          {mode === "cozy" && (
            <span className="mt-1.5 block space-y-1">
              <span className="block h-1 w-full rounded-full bg-cream-deep" />
              <span className="block h-1 w-3/5 rounded-full bg-cream-deep" />
            </span>
          )}
        </motion.span>
      )}
      {mode === "list" && (
        <span
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: `var(--color-${s.theme})` }}
        />
      )}
    </motion.div>
  );
}

export function ViewModes() {
  const reduce = useReducedMotion() ?? false;
  const demoRef = useRef<HTMLDivElement>(null);
  const inView = useInView(demoRef, { amount: 0.45 });
  const [mode, setMode] = useState<ViewMode>("grid");
  const holdUntil = useRef(0);

  // idle cycle: same in-view gating as the hero phone (app-preview.tsx)
  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => {
      if (Date.now() < holdUntil.current) return;
      setMode((m) => nextViewMode(m));
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reduce, inView]);

  const pick = (m: ViewMode) => {
    holdUntil.current = Date.now() + MANUAL_PAUSE_MS;
    setMode(m);
  };

  return (
    <section className="px-5 py-12">
      <div className="mx-auto grid max-w-4xl items-center gap-9 md:grid-cols-2">
        {/* copy */}
        <div className="text-center md:text-left">
          <h2 className="font-display font-semibold leading-tight text-ink" style={{ fontSize: "clamp(1.7rem, 6vw, 2.4rem)" }}>
            See it your way
          </h2>
          <p className="mx-auto mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-brown md:mx-0">
            Every list can be browsed three ways. Pick whatever feels right for what&rsquo;s inside. Same little world, just rearranged.
          </p>
        </div>

        {/* the demo: one list, three arrangements, morphing live */}
        <motion.div
          ref={demoRef}
          variants={reduce ? undefined : fadeSlide}
          initial={reduce ? false : "hidden"}
          whileInView={reduce ? undefined : "show"}
          viewport={inViewOnce}
          className="mx-auto w-full max-w-sm"
        >
          <div
            role="group"
            aria-label="Demo of the three list views"
            className="rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-line/40"
          >
            <div className="flex justify-center">
              <ViewToggle value={mode} onChange={pick} />
            </div>
            <div className={`mt-4 ${mode === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}`}>
              {SAMPLE.map((s) => (
                <DemoItem key={s.title} s={s} mode={mode} reduce={reduce} />
              ))}
            </div>
            <motion.p
              key={mode}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-3.5 text-center text-[0.85rem] leading-snug text-ink-soft"
            >
              <span className="font-semibold text-ink">{TITLES[mode]}</span> &mdash; {LINES[mode]}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc silent; lint shows only the 4 known pre-existing findings (none in `view-modes.tsx`).

- [ ] **Step 3: Verify in the browser**

Start `npm run dev`, open `http://localhost:3000/`, scroll to "See it your way", and confirm:
- The four posters render as a 2×2 grid initially.
- After ~3.5s in view, the grid morphs into list rows (posters shrink and slide, titles fade in), then cozy cards, then back.
- Clicking a toggle button switches immediately and the idle cycle stays quiet for ~8s.
- Tab reaches the three toggle buttons; Enter/Space activates them; `aria-pressed` follows the active mode.
- Nothing overlaps or overflows at 320px width.

- [ ] **Step 4: Commit**

```bash
git add components/landing/view-modes.tsx
git commit -m "feat(landing): interactive grid/list/cozy morphing demo for view modes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Hero headline

**Files:**
- Modify: `components/landing/landing-hero.tsx:90-92`

**Interfaces:** none (content + one style value).

- [ ] **Step 1: Tighten headline and clamp**

In `components/landing/landing-hero.tsx`, the H1 currently reads:

```tsx
          <h1 className="font-display font-semibold leading-[1.06] text-ink" style={{ fontSize: "clamp(1.85rem, 7.5vw, 3.4rem)" }}>
            Make little lists for everything you love, hate, and want to remember.
          </h1>
```

Replace with:

```tsx
          <h1 className="font-display font-semibold leading-[1.06] text-ink" style={{ fontSize: "clamp(1.85rem, 7.5vw, 3.1rem)" }}>
            Little lists for everything you love, hate, and want to remember.
          </h1>
```

- [ ] **Step 2: Verify**

With dev running, check the hero at 1280px: headline sits at three lines, no orphaned single word on the last line. At 320px it remains readable and unclipped.

- [ ] **Step 3: Commit**

```bash
git add components/landing/landing-hero.tsx
git commit -m "polish(landing): tighten hero headline to three desktop lines

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Privacy lock pop + sage wash

**Files:**
- Create: `components/landing/lock-pop.tsx`
- Modify: `components/landing/privacy.tsx`

**Interfaces:**
- Consumes: `StickerBadge { icon, size }` from `components/icons/sticker-badge.tsx`; `STICKER_POP` from `components/icons/glyph-motion.ts`.
- Produces: `export function LockPop(): JSX.Element` — used only by `privacy.tsx`, which stays a server component.

- [ ] **Step 1: Create the client island**

Create `components/landing/lock-pop.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { StickerBadge } from "@/components/icons/sticker-badge";
import { STICKER_POP } from "@/components/icons/glyph-motion";

/** The privacy card's lock, giving one soft sticker pop as it scrolls into view. */
export function LockPop() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  return (
    <motion.span
      ref={ref}
      className="inline-flex"
      initial={false}
      animate={inView && !reduce ? STICKER_POP : undefined}
      transition={{ duration: 0.5, ease: "easeInOut", delay: 0.2 }}
    >
      <StickerBadge icon="lock" size={64} />
    </motion.span>
  );
}
```

- [ ] **Step 2: Use it and warm the card wash**

In `components/landing/privacy.tsx`:

1. Add the import: `import { LockPop } from "./lock-pop";` and remove the now-unused `StickerBadge` import.
2. Replace `<StickerBadge icon="lock" size={64} className="mx-auto" />` with `<LockPop />` (the section's `text-center` centers the inline-flex span).
3. On the card `<div>`, replace the class `bg-cream-deep/60` with nothing and add a style prop so the wash picks up a whisper of sage:

```tsx
      <div
        className="mx-auto max-w-2xl rounded-[var(--radius-2xl)] px-6 py-12 text-center ring-1 ring-line/50"
        style={{ background: "color-mix(in oklab, var(--color-sage) 12%, var(--color-cream-deep) 60%, transparent)" }}
      >
```

(If the triple color-mix renders wrong — check visually — fall back to `color-mix(in oklab, var(--color-sage) 12%, var(--color-cream-deep))` at full opacity.)

- [ ] **Step 3: Verify**

Dev server: scroll to "Private by default" — lock pops once on entry (and not under reduced motion), card reads faintly sage-warm rather than pure cream. `npx tsc --noEmit` silent.

- [ ] **Step 4: Commit**

```bash
git add components/landing/lock-pop.tsx components/landing/privacy.tsx
git commit -m "polish(landing): lock sticker pop and sage wash on privacy card

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Final CTA sticker drift

**Files:**
- Modify: `components/landing/final-cta.tsx`

**Interfaces:**
- Consumes: `gentleFloat(delay)` from `lib/motion.ts`.

- [ ] **Step 1: Float the two corner stickers**

In `components/landing/final-cta.tsx`:

1. Extend the motion import: `import { softSpring, tap, gentleFloat } from "@/lib/motion";`
2. Replace the two `<Sticker …>` lines:

```tsx
        <Sticker name="flower" size={64} rotate={-14} className="pointer-events-none absolute -left-4 -top-3 opacity-30" />
        <Sticker name="sparkle" size={52} rotate={12} className="pointer-events-none absolute -bottom-3 -right-2 opacity-30" />
```

with reduce-guarded floating wrappers:

```tsx
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -left-4 -top-3 inline-flex"
          animate={reduce ? undefined : gentleFloat(0)}
        >
          <Sticker name="flower" size={64} rotate={-14} className="opacity-30" />
        </motion.span>
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -bottom-3 -right-2 inline-flex"
          animate={reduce ? undefined : gentleFloat(1.4)}
        >
          <Sticker name="sparkle" size={52} rotate={12} className="opacity-30" />
        </motion.span>
```

(`reduce` already exists in this component from `useReducedMotion()`.)

- [ ] **Step 2: Verify + commit**

Dev server: the CTA corner stickers drift almost imperceptibly; static under reduced motion. Then:

```bash
git add components/landing/final-cta.tsx
git commit -m "polish(landing): gentle float on final CTA corner stickers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Full verification sweep

**Files:** none (verification only; fix-forward if anything fails).

- [ ] **Step 1: Static checks**

Run: `npm run lint && npx tsc --noEmit && npx vitest run && npm run build`
Expected: lint = only the 4 known pre-existing findings; tsc silent; 82 tests pass (80 existing + Task 1's + Task 2's); build completes with all landing art prerendered.

- [ ] **Step 2: Responsive sweep (Playwright MCP)**

For widths 320 / 375 / 390 / 430 / 768 / 1280: load `http://localhost:3000/`, slow-scroll the whole page, then assert `document.documentElement.scrollWidth <= window.innerWidth`. Screenshot the view-modes, people, privacy, and final-CTA sections at 390 and 1280 for a visual pass.

- [ ] **Step 3: Interaction + reduced-motion pass**

- View-modes demo: auto-cycles in view; manual tap pauses ~8s; keyboard operable.
- `emulateMedia({ reducedMotion: 'reduce' })`, fresh load: no auto-cycle, no morph (instant swaps), no floats, lock static, zero console errors.
- Normal fresh load: zero console errors.

- [ ] **Step 4: Anchor + heading check**

Hero's "See what you can make" still lands on `#use-cases`; the page now has no duplicate/near-duplicate section headings ("Remember the little things" appears only on the showcase teaser card).

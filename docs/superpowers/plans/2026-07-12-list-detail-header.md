# List Detail Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the list-detail header as one persistent chrome strip plus an in-flow themed title block that dissolves into cream, with a CSS scroll-driven collapse — per `docs/superpowers/specs/2026-07-12-list-detail-header-design.md`.

**Architecture:** The strip (back / compact title / ⋯ menu) is `sticky top-0` from scroll zero, transparent at rest, fading up an opaque tinted surface via `animation-timeline: scroll(root)`. The title block is content in the scroll flow: an absolutely-positioned themed field (extends up under the status bar, mask-fades into cream at its bottom) behind a 40px emoji sticker and a large Fraunces title with SOFT/WONK. The existing controls bar moves into a second sticky element that docks directly beneath the pinned strip so the two read as a single chrome layer when scrolled.

**Tech Stack:** Next.js App Router, next/font/google (Fraunces variable axes), Tailwind v4 (`@theme` in globals.css), CSS scroll-driven animations with `@supports` gate, motion/react (existing button taps only — no new JS animation).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-12-list-detail-header-design.md` — read it first.
- AGENTS.md: this Next.js version differs from training data; check `node_modules/next/dist/docs/` before using unfamiliar APIs.
- `npm run build` is the gate (catches RSC-boundary breaks). ~7 pre-existing lint errors exist — do NOT chase them.
- No `backdrop-blur` on the new chrome surfaces — opaque tint is a deliberate spec decision (anti-glass). The existing `backdrop-blur-sm` on the round back button is out of scope; leave it.
- No em dashes in UI copy; no pure `#000`/`#fff` (use existing OKLCH tokens).
- **Fraunces opsz trap:** any `font-variation-settings` declaration that sets `SOFT`/`WONK` MUST also set `"opsz"` in the same declaration, or optical sizing silently dies. Never set `font-variation-settings` on Fraunces text without `opsz`.
- No hide-on-scroll header, no image backdrops, no home-card changes (all explicitly out of scope in the spec).
- `prisma migrate dev` fails non-interactively — irrelevant here, no schema changes; do not touch the DB.

## Layout model (read before any task)

The app shell (`components/app-shell.tsx:57-61`) is a `max-w-[440px]` column inside a document-level scroller — the **window** scrolls, which is why the current `sticky top-0` bar works. Two consequences:

1. The scroll timeline must be `scroll(root)`, NOT `scroll()` / `scroll(nearest)`: the shell wrapper has `overflow-x-hidden`, which makes it a candidate scroll container, so "nearest" could bind to a box that never scrolls and freeze the animation at 0%.
2. Sticky elements are contained by their parent. The strip and controls must be **direct children of the page-level theme wrapper** (`<div className={themeClass(list.theme)}>` in page.tsx renders `DetailHeader` as a direct child, and `DetailHeader` returns a fragment) — never nested inside a header-height wrapper, or they unpin as soon as the header scrolls past.

The themed field paints *behind* the transparent strip at rest by being absolutely positioned inside the title block with a negative top offset of exactly the strip's height (`--strip-h`), reaching the top of the document.

One deliberate realization detail (flagged to the user at handoff): at rest the visual order is strip row → **title block** → controls, with the controls docking under the strip only when pinned (`sticky top: var(--strip-h)`). The spec's "same sticky container" is realized as two sticky elements that dock into one visual surface when scrolled — putting controls literally above the title at rest would undermine the spec's own "title leads" principle.

---

### Task 1: Fraunces variable axes + payload measurement

**Files:**
- Modify: `app/layout.tsx:38-43`

**Interfaces:**
- Produces: Fraunces served with `opsz`, `SOFT`, `WONK` axes. Task 2's `.detail-title` rule depends on these axes existing in the font file.

- [ ] **Step 1: Record the BEFORE font payload**

```bash
npm run build 2>&1 | tail -5 && du -cb .next/static/media/*.woff2 | tail -1
```

Expected: build succeeds; note the total bytes (this is the before number; Fraunces + Nunito woff2 files combined).

- [ ] **Step 2: Add the axes**

In `app/layout.tsx`, change the Fraunces loader to exactly:

```ts
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});
```

Note: next/font requires axes in alphabetical order-insensitive array, but validates each against the font's axis list (`SOFT`, `WONK`, `opsz` are all valid for Fraunces — confirmed in `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`). If the build errors about axis names or ordering, read the error — it lists the accepted values — and match it exactly.

- [ ] **Step 3: Record the AFTER payload and apply the guardrail**

```bash
npm run build 2>&1 | tail -5 && du -cb .next/static/media/*.woff2 | tail -1
```

Expected: build succeeds. Compare totals:
- Increase < ~120 KB total: keep all three axes.
- Increase ≥ ~120 KB: drop `"WONK"` from the array, rebuild, re-measure. Still ≥ ~120 KB over the before number: drop `"SOFT"` too, keep only `["opsz"]`, and note it in the commit message so later tasks skip WONK/SOFT values.

- [ ] **Step 4: Commit (record both numbers in the message)**

```bash
git add app/layout.tsx
git commit -m "feat(fonts): load Fraunces opsz/SOFT/WONK axes

Font payload before: <N> bytes, after: <M> bytes.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Header CSS — field, strip surfaces, scroll-driven collapse

**Files:**
- Modify: `app/globals.css` (append after the `.fade-x` block, before `::selection`)

**Interfaces:**
- Consumes: Fraunces axes from Task 1 (`.detail-title` variation settings).
- Produces: classes `detail-strip`, `detail-strip-title`, `detail-controls`, `detail-field`, `detail-title` and the `--strip-h` custom property. Task 3's JSX uses these exact class names. `--strip-h` = `calc(env(safe-area-inset-top) + 3.5rem)` — Task 3's strip padding must add up to exactly this (0.5rem top pad + 2.5rem button + 0.5rem bottom pad).

This task is pure CSS with no consumers yet, so it lands with zero visual change — safe to commit independently.

- [ ] **Step 1: Append the header CSS to `app/globals.css`**

```css
/* ── List detail header ────────────────────────────────────────
   One chrome layer: the strip (back / compact title / menu) is sticky
   from scroll zero; the controls bar docks beneath it. The themed title
   field is content and scrolls away. Chrome surfaces are opaque tint,
   never glass. --strip-h must equal the strip's rendered height:
   0.5rem pad + 2.5rem button + 0.5rem pad + safe-area.               */
:root {
  --strip-h: calc(env(safe-area-inset-top) + 3.5rem);
}

/* themed field behind the title block: bleeds up under the status bar
   (negative top offset in the JSX) and mask-fades into cream, so the
   grain + tint dissolve together instead of ending in a card edge */
.detail-field {
  background: var(--t-bg);
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 calc(100% - 2.5rem), transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 calc(100% - 2.5rem), transparent 100%);
}

/* the big title is the one place Fraunces gets its full character.
   opsz MUST ride along: font-variation-settings overrides
   font-optical-sizing:auto, so omitting it silently kills optical sizing */
.detail-title {
  font-variation-settings: "opsz" 26, "SOFT" 50, "WONK" 1;
}

/* pinned-chrome surface: opaque tint mixed toward paper.
   Base = surface always on (browsers without scroll timelines). */
.detail-strip,
.detail-controls {
  --strip-surface: color-mix(in oklab, var(--t-bg) 60%, var(--color-paper));
  background-color: var(--strip-surface);
}

/* compact strip title only exists where the collapse choreography does */
.detail-strip-title {
  display: none;
}

@supports (animation-timeline: scroll()) {
  /* at rest the chrome floats transparent over the themed field; the
     surface fades up 1:1 with scroll (scroll(root): the window scrolls
     this app — nearest would bind to the overflow-x-hidden shell) */
  .detail-strip,
  .detail-controls {
    background-color: transparent;
    animation: detail-surface-in linear both;
    animation-timeline: scroll(root);
    animation-range: 24px 140px;
  }
  .detail-strip-title {
    display: block;
    opacity: 0;
    translate: 0 4px;
    animation: detail-strip-title-in linear both;
    animation-timeline: scroll(root);
    animation-range: 90px 170px;
  }
}

/* scroll-driven progress ignores animation-duration, so the global
   reduced-motion rule can't soften this one; collapsing the range makes
   the surface swap effectively instant instead of scroll-coupled */
@media (prefers-reduced-motion: reduce) {
  .detail-strip,
  .detail-controls,
  .detail-strip-title {
    animation-range: 0px 1px;
  }
}

@keyframes detail-surface-in {
  to {
    background-color: var(--strip-surface);
  }
}

@keyframes detail-strip-title-in {
  to {
    opacity: 1;
    translate: 0 0;
  }
}
```

If Task 1 ended up dropping WONK (or SOFT) from the loaded axes, remove that pair from `.detail-title`'s `font-variation-settings` — requesting an unloaded axis is inert but misleading.

- [ ] **Step 2: Verify the build and the no-op**

```bash
npm run build 2>&1 | tail -5
```

Expected: build succeeds. No component uses these classes yet, so no visual change.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(css): detail-header collapse system (scroll-driven, opaque chrome, @supports-gated)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Rebuild DetailHeader and rewire the list page

**Files:**
- Modify: `components/detail-header.tsx` (full rewrite, 51 lines currently)
- Modify: `app/app/(main)/list/[id]/page.tsx:215-317` (header usage + delete the old sticky bar)

**Interfaces:**
- Consumes: CSS classes and `--strip-h` from Task 2, exactly as named there.
- Produces: `DetailHeader` props gain `controls?: ReactNode`; the component now returns a fragment of three page-level siblings (strip, title block, controls). `page.tsx` is the only consumer in the repo (verify with `grep -rn "DetailHeader" --include="*.tsx" .` — if other consumers appear, they keep working because `controls` is optional).

These two files must change together — the page's old sticky bar and the new `controls` slot are the same UI — so this is one task.

- [ ] **Step 1: Rewrite `components/detail-header.tsx`**

Replace the entire file with:

```tsx
"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { Sticker, type StickerName } from "./sticker";
import { StickerBadge } from "./icons/sticker-badge";

interface DetailHeaderProps {
  emoji: string;
  title: string;
  subtitle?: string;
  sticker?: StickerName;
  menu?: ReactNode;
  /** search/sort/filter rows; docks beneath the pinned strip on scroll */
  controls?: ReactNode;
}

/**
 * One chrome layer plus an in-flow title block.
 * - The strip (back / compact title / menu) is sticky from scroll zero,
 *   transparent over the themed field at rest, fading up an opaque tinted
 *   surface as the title scrolls away (CSS scroll-driven, see globals.css).
 * - The title block is content: its themed field reaches up under the
 *   status bar (negative --strip-h offset) and dissolves into cream.
 * - Renders as a fragment: strip, title block, and controls must be
 *   direct children of the page-level theme wrapper, or sticky unpins
 *   when the header scrolls past. Parent provides the theme-* class.
 */
export function DetailHeader({ emoji, title, subtitle, sticker = "sparkle", menu, controls }: DetailHeaderProps) {
  const router = useRouter();

  return (
    <>
      <div className="detail-strip sticky top-0 z-20 flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <motion.button
          type="button"
          whileTap={tap}
          onClick={() => router.back()}
          aria-label="Back"
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper/80 text-ink shadow-soft backdrop-blur-sm ${focusRing}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        {/* pure echo of the h1 below, so it stays hidden from the tree */}
        <span
          aria-hidden
          className="detail-strip-title min-w-0 flex-1 truncate text-center font-display text-[1.05rem] font-semibold text-[var(--t-ink)]"
        >
          {title}
        </span>
        <div className="shrink-0">{menu}</div>
      </div>

      <div className="relative z-[1] px-5 pb-8 pt-3">
        {/* themed field: paints behind the transparent strip up to the top
            of the document, dissolves into cream at its bottom edge */}
        <div
          aria-hidden
          className="detail-field paper-grain absolute inset-x-0 -bottom-10 top-[calc(-1*var(--strip-h))] -z-[1]"
        />
        <Sticker
          name={sticker}
          size={92}
          className="pointer-events-none absolute -right-4 -top-8 opacity-20"
          rotate={14}
        />
        <div className="relative flex items-end gap-3">
          <StickerBadge emoji={emoji} size={40} className="-rotate-3" />
          <div className="min-w-0 pb-0.5">
            <h1 className="detail-title font-display text-[2.1rem] font-semibold leading-[1.08] text-[var(--t-ink)]">
              {title}
            </h1>
            {subtitle && <p className="mt-1.5 text-[0.92rem] font-semibold text-brown">{subtitle}</p>}
          </div>
        </div>
      </div>

      {controls && (
        <div className="detail-controls sticky z-10 px-4 pb-2 pt-2" style={{ top: "var(--strip-h)" }}>
          {controls}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Rewire `app/app/(main)/list/[id]/page.tsx`**

Three coordinated edits:

**(a)** Change the `DetailHeader` call (currently lines 218-224) to pass the controls as a prop. The controls JSX is the exact current content of the old sticky bar (lines 245-315: the search/sort/view row, `FilterChips`, and the tag/person rail) with its outer sticky `div` removed:

```tsx
<DetailHeader
  emoji={list.emoji}
  title={list.title}
  subtitle={listCountLabel(list)}
  sticker={TEMPLATE_META[list.template].sticker}
  menu={listMenu}
  controls={
    list.items.length > 0 ? (
      <>
        <div className="mb-2 flex items-center justify-end gap-2">
          {showSearch && (
            <div className="relative flex-1">
              {/* …search input block, verbatim from the old sticky bar… */}
            </div>
          )}
          <SortControl value={sort} onChange={changeSort} />
          <ViewToggle value={view} onChange={changeView} />
        </div>
        <FilterChips options={options} active={filter} onChange={setFilter} />
        {(tagOptions.length > 0 || personOptions.length > 0) && (
          <div className="no-scrollbar fade-x -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {/* …person + tag chip buttons, verbatim from the old sticky bar… */}
          </div>
        )}
      </>
    ) : null
  }
/>
```

The "verbatim" blocks mean: cut the existing JSX from lines 246-314 and paste it unchanged — do not retype it. `showSearch`, `searching`, `query`, and every other referenced binding is declared before the `return`, so hoisting this JSX into a prop expression inside the same `return` changes nothing about scope.

**(b)** Delete the old sticky bar wrapper entirely — the `{list.items.length > 0 && (<div className="sticky top-0 z-10 px-4 pt-3 pb-2 backdrop-blur-md" style={{ background: "linear-gradient(…)" }}>…</div>)}` block (lines 235-317). Its content now lives in the `controls` prop; its `backdrop-blur-md` and gradient are intentionally gone (opaque tint in CSS replaced them).

**(c)** The `PeopleTemplateNudge` block (lines 229-233) currently sits between the header and the old sticky bar. Keep it after `<DetailHeader …/>` — it will now render after the controls, which is correct: chrome first, then in-page notices.

- [ ] **Step 3: Verify no other DetailHeader consumers broke**

```bash
grep -rn "DetailHeader" --include="*.tsx" app components
```

Expected: only `components/detail-header.tsx` and `app/app/(main)/list/[id]/page.tsx`. (If a person/profile page also uses it, it compiles fine — `controls` is optional and those pages keep their current look minus the banner, which would need its own review; flag it in the commit message.)

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | tail -8
```

Expected: build succeeds (ignore the ~7 pre-existing lint errors if the build surfaces them — they are known).

- [ ] **Step 5: Commit**

```bash
git add components/detail-header.tsx "app/app/(main)/list/[id]/page.tsx"
git commit -m "feat(header): one chrome layer + in-flow title block on list detail

Strip pinned from scroll zero (back/compact-title/menu), controls dock
beneath it; themed field bleeds under the status bar and dissolves into
cream; emoji demoted 64->40px so the Fraunces title leads. Replaces the
banner + second sticky bar and the backdrop-blur surface (opaque tint,
per spec).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Visual verification pass

**Files:**
- None expected; fix-ups to `app/globals.css` / `components/detail-header.tsx` only if a check fails.

**Interfaces:**
- Consumes: everything above, running in the dev server.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

(background; wait for "Ready"). Open the app with the Playwright browser tools at mobile size — resize to 390x844. If Clerk blocks on sign-in, use the existing signed-in browser profile from prior sessions; if that's unavailable, stop and ask the user to sign in once in the Playwright browser.

- [ ] **Step 2: At-rest checks (scroll position 0, on a list with >30 items so search shows)**

- Themed field visible from the very top of the viewport (no cream gap above it), dissolving into cream below the title with no hard rounded edge.
- Strip transparent: field color visible behind the back button row.
- No compact title visible in the strip.
- Title renders large (~2.1rem) in Fraunces; emoji sticker is 40px, slightly rotated, visually subordinate to the title.
- Controls (search/sort/view, filter chips) sit below the title block.

- [ ] **Step 3: Scrolled checks (scroll ~300px down)**

- Strip pinned at top with an opaque tinted surface (no blur: content scrolling behind must NOT show through).
- Compact title visible in the strip, truncated if long.
- Controls docked directly beneath the strip, same surface tone, no gap and no overlap between the two (if there is a gap or overlap, `--strip-h` doesn't match the strip's real height — measure the strip with the browser tools and fix the padding, not the variable).
- Scroll slowly: surface fade tracks the thumb 1:1 with no jump. Take screenshots at rest / mid / pinned.

- [ ] **Step 4: Regression checks**

- Back button and ⋯ menu clickable at every scroll position.
- Sort/view/filter/search all still functional (they only moved, not changed).
- Home page and People pages unaffected.
- Reduced motion: emulate `prefers-reduced-motion: reduce`, reload — the surface should be ON essentially immediately once scrolled (range collapses to 0-1px), everything usable.

- [ ] **Step 5: Fix anything that failed, rebuild, commit fix-ups**

```bash
git add -A && git commit -m "fix(header): visual-pass adjustments

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Only if fixes were needed. Then stop the dev server.

---

## Self-review notes

- Spec coverage: axes (Task 1), one chrome layer + title-as-content + gradient dissolve + 40px emoji + large characterful title (Task 3), scroll-driven 1:1 collapse + `@supports` fallback + opaque anti-glass surface (Task 2), payload guardrail (Task 1 Step 3), out-of-scope items untouched. The spec's "reduced motion is covered by the existing global rule" claim is technically wrong for scroll timelines (they ignore `animation-duration`), so Task 2 adds an explicit `animation-range: 0px 1px` override that delivers the spec's stated intent ("degrades to instant").
- The controls-below-title-at-rest realization (vs. the spec's literal "same sticky container") is flagged in the Layout model section and must be mentioned to the user at handoff.

# List Detail Header Redesign

**Date:** 2026-07-12
**Status:** Approved (design discussed and accepted in session)
**Scope:** The list-detail title/header section only. The type-led home-card redesign is explicitly deferred to its own future spec. The Fraunces axes change in this spec is shared groundwork for that later work.

## Problem

The list detail screen stacks two persistent chrome layers on a phone:

1. `components/detail-header.tsx` — a themed banner (`rounded-b-[2rem]`, `background: var(--t-bg)`) holding back button, menu, a 64px emoji `StickerBadge`, and the title at `text-[1.65rem]`. It never collapses; it scrolls away as a block.
2. `app/app/(main)/list/[id]/page.tsx` (~line 236) — a second `sticky top-0` bar with `backdrop-blur-md` and a themed gradient, holding search, sort, view toggle, and filter chips.

Problems, in order of severity:

- Two stacked chrome layers eat vertical space on the screen where users spend the most time.
- The 64px emoji badge visually outweighs the list title; the title should be the loudest element on its own page.
- The `rounded-b-[2rem]` bottom edge makes the themed area read as a banner *component* sitting on the page, rather than the page itself being themed.
- Fraunces is loaded weight-only (`app/layout.tsx:38`), so we get one fixed design at every size — no optical sizing, none of the typeface's character axes.

## Design

### 1. Font foundation (shared prerequisite)

`app/layout.tsx` — add axes to the Fraunces loader:

```ts
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});
```

This unlocks optical sizing (display sizes get tighter/higher-contrast, small sizes open up), SOFT (inkiness), and WONK (wonky display glyphs). WONK auto-disables at ≤18pt, so it can only affect headings — it cannot leak into item titles or chips.

**Silent-failure trap (must be respected everywhere Fraunces variation settings are written):** setting `font-variation-settings` for SOFT **overrides** `font-optical-sizing: auto` entirely, with no error. Any declaration like `font-variation-settings: "SOFT" 60` must also pass `"opsz" <value>` in the same declaration, or optical sizing is silently lost.

**Payload guardrail:** measure the Fraunces woff2 payload before and after adding axes (network tab or build output). If the increase is ugly relative to the just-shipped perf pass, drop `WONK` first, then `SOFT`; keep `opsz`.

### 2. Header architecture: one chrome layer

The new structure has exactly one persistent element.

**The sticky strip (the only chrome).** Pinned from scroll position zero. Contains:

- Back chevron (left) and ⋯ menu (right) — always present, never move, never resize, never appear/disappear by context (NN/g target-stability rule).
- A compact list title that fades in as the title block scrolls away.
- Directly beneath, in the same sticky container: the existing controls row (search when `items.length > 30`, sort, view toggle, filter chips). These move from the current second sticky bar into this container; the second sticky layer is deleted.

At rest (scroll zero) the strip floats over the themed title field with no background of its own. As the user scrolls, the strip fades up an **opaque tinted surface** derived from the list theme (e.g. `color-mix` of `--t-bg` over cream) plus the compact title.

**Deliberate reversal:** the current `backdrop-blur-md` is replaced by this opaque surface. This is the anti-glass, legibility-first position per PRODUCT.md's anti-references. If the opaque bar feels heavy in review, a near-opaque tint is the one-line retreat — but blur is not the default.

**The title block (content, not chrome).** First element in the scroll flow; scrolls away like content:

- Full-bleed field of `var(--t-bg)` plus the app's paper grain, bleeding up under the status bar (`env(safe-area-inset-top)`).
- Bottom edge dissolves into cream via a gradient — replacing `rounded-b-[2rem]`. No hard card edge.
- Emoji as a small stuck-on sticker: **~40px** (down from the 64px badge). Starting knob, not doctrine; 44–48px is an acceptable landing if 40px feels demoted in review. The title must read as the dominant element.
- List title in large Fraunces with SOFT and WONK active — the one place in the app where the serif is genuinely characterful. Subtitle (item count) stays beneath in the current style.
- The large corner `Sticker` (92px, opacity-20) stays in the field, tucked as today.

### 3. Collapse mechanics

- Scroll-coupled **1:1** via CSS scroll-driven animation (`animation-timeline: scroll()`): compression tracks the thumb exactly; no threshold-triggered snapping. (NN/g: collapse must be "quick, smooth, and immediate," never jump or startle.)
- Because it is pure CSS animation, the existing global `prefers-reduced-motion` rule in `app/globals.css` covers it automatically — it degrades to instant, which is acceptable. This is *not* the motion/react reduced-motion gap encountered previously.
- **Progressive enhancement (required):** `animation-timeline: scroll()` is not universal (Firefox still gates it). Without support, the strip is simply always pinned with its tinted surface visible, and the title block scrolls away normally. Fully usable; only the fade choreography is lost. Feature-gate via `@supports (animation-timeline: scroll())`.

### 4. Explicitly out of scope

- **No hide-on-scroll-down / reveal-on-scroll-up.** The claim that NN/g endorses it was refuted in verification (0–3). Not building on vibes.
- **No image backdrop.** Letterboxd's effect needs a photograph dissolving into near-black; a pastel dissolving into cream is a much smaller tonal move and should be honest and quiet, not a weak imitation.
- **No home-card changes.** Type-led card redesign (drop template pill + view glyph, Fraunces-led cards, covers as peek) is a separate future spec.

## Files touched

| File | Change |
|---|---|
| `app/layout.tsx` | Add `axes: ["opsz", "SOFT", "WONK"]` to Fraunces loader |
| `components/detail-header.tsx` | Rebuild: sticky strip + in-flow title block, gradient dissolve, 40px emoji, large Fraunces title |
| `app/app/(main)/list/[id]/page.tsx` | Move search/sort/view/filter controls into the header's sticky container; delete the second sticky bar |
| `app/globals.css` | Scroll-driven animation keyframes + `@supports` gate; any Fraunces variation utilities (with the opsz trap respected) |

## Testing

- `npm run build` (the only gate that catches RSC-boundary breaks; ~7 pre-existing lint errors are known — don't chase).
- Manual/Playwright pass on a list detail page: strip controls stable at every scroll position; collapse tracks scroll 1:1; reduced-motion degrades to instant; no-`animation-timeline` fallback leaves a permanently-surfaced strip.
- Font payload before/after measurement recorded in the PR/commit message.
- Verify WONK does not appear in any ≤18pt text.

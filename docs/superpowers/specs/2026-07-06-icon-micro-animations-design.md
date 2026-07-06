# Icon Micro-Animations + CategoryIcon API — Design

**Date:** 2026-07-06
**Status:** Approved

## Context

The hand-drawn icon/sticker system shipped in `3a56caf` (single `GLYPH_ART`
registry, `CategoryIcon`, `StickerBadge`, `AnimatedSticker`, `SaveSparkle`).
Two gaps remain against the original spec:

1. No per-icon interaction micro-animations (only the generic ambient
   float/twinkle used in empty states and onboarding).
2. `CategoryIcon` has a minimal API (`id`, numeric `size`, `className`) —
   no size tokens, variants, or accessibility label.

This design fills both gaps. It does not redraw the existing glyph set
(except the movie icon, below) and does not touch display-only surfaces.

## 1. Art changes (`components/icons/glyphs.tsx`)

- Add a `clapperboard` glyph: board body + striped lid in the existing
  pastel/soft-stroke language. `CATEGORY_GLYPH.movie` and `.movies` move
  from `film` to `clapperboard`. The `film` strip remains as a decorative
  sticker (`StickerName`) — nothing that uses it as decoration changes.
- Glyphs whose animation moves a *sub-part* — clapperboard (lid), book
  (halves), gift (bow), tulip (petals) — get their shape data exported as
  named constants. Static art and animated art compose the same constants,
  so the drawings can never drift apart.
- `glyphs.tsx` stays static and server-safe (no `"use client"`, no motion
  imports).

## 2. `AnimatedCategoryIcon` (`components/icons/animated-category-icon.tsx`)

New client component. Props:

| Prop | Type | Meaning |
|---|---|---|
| `id` | `string` | category id, same resolution as `CategoryIcon` |
| `size` | `"sm" \| "md" \| "lg" \| number` | same tokens as `CategoryIcon` |
| `variant` | `"plain" \| "badge" \| "sticker"` | same as `CategoryIcon` |
| `play` | `boolean` | parent flips true on tap/selection; plays once |
| `className`, `ariaLabel` | | as on `CategoryIcon` |

- A `GLYPH_MOTION` registry (mirroring the `GLYPH_ART` pattern) maps glyph
  name → its character move:
  - `clapperboard`: lid claps (quick rotate at hinge, twice)
  - `book`: halves open slightly (small opposing rotate/skew)
  - `gift`: bow pops (spring scale on the bow layer)
  - `tulip`: petals bloom (scaleY from base, slight spread)
  - `flower` / `heart`: soft pulse (whole-icon scale)
  - `fork`: tiny wiggle (whole-icon rotate keyframes)
  - `sparkle`: twinkle (rotate + scale shimmer)
  - `ramen-bowl`: steam rises (steam strokes translate/fade)
  - `pencil`: little tilt (whole-icon rotate settle)
  - anything unmapped: gentle sticker pop (scale spring)
- Sub-part animations render the glyph locally with `motion.g` wrappers
  around the exported shape constants; whole-icon animations wrap the
  static `GlyphSvg`.
- All variants get a shared subtle `whileTap` squish.
- `useReducedMotion()` disables all animation (renders static).
- No looping/ambient animation — fires only when `play` transitions.

## 3. `CategoryIcon` API upgrade (back-compatible)

- `size?: "sm" | "md" | "lg" | number` — tokens map to 14 / 18 / 22 px.
  Numbers keep working; existing call sites don't churn.
- `variant?: "plain" | "badge" | "sticker"` — default `"plain"` (today's
  behavior). `"badge"` wraps the glyph in the existing `StickerBadge` tile.
  `"sticker"` renders a paper tile with slight rotation + soft shadow
  (scrapbook treatment).
- `ariaLabel?: string` — when set, the svg renders `role="img"` +
  `aria-label`; otherwise stays `aria-hidden` as today.

## 4. Wiring

`AnimatedCategoryIcon` with `play` bound to selection replaces the static
icon in the four interactive pickers:

- template picker (`components/list-form-fields.tsx`)
- add-item type chips (`components/add-item-modal.tsx`)
- add-detail section picker (`components/add-detail-sheet.tsx`)
- onboarding starter picks (`components/onboarding/onboarding-flow.tsx`)

Display-only surfaces stay static: home category chips, person cards,
person detail section headers, status pills. ("Do not animate constantly.")

## 5. Tests & docs

- Extend `lib/icons.test.ts`: every `CATEGORY_GLYPH` value has art; every
  `GLYPH_MOTION` key is a valid glyph name; `movie` maps to `clapperboard`.
- Update `docs/ASSETS.md`: document the motion layer, the sub-part
  constant convention, and how a vendor asset swap would interact with it.

## Out of scope

- Redrawing any glyph other than the movie clapperboard.
- Hover-only animations, ambient loops, or animating display surfaces.
- Twemoji/vendor icon integration (swap point stays documented).

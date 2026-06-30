# Design

Visual system for Little Lists, the Soft Collectible Scrapbook. Captured from the live token system in `app/globals.css` and the component library in `components/`. This documents what exists so polish stays on-brand; it is not a redesign.

## Visual Theme

Warm cream paper with muted pastel keepsakes. The surface reads like a physical scrapbook page: a barely-there paper grain (`.paper-grain`, fractal-noise SVG at ~0.45 opacity, multiply blend), pillowy rounded shapes, and soft warm-tinted shadows that never go harsh. Light mode only by design (the scene is a calm daytime moment on a phone, not a dim room). Each list and person carries one of six pastel themes that wash its surfaces. Stickers (film, book, star, heart, flower, leaf, sparkle) bleed off card corners like real scrapbook stickers.

## Color

Strategy: **Restrained, per-surface tinted.** A warm cream/ink neutral spine carries the app; each list/person surface adds exactly one pastel theme wash. Never more than one theme color active on a surface at once. All values OKLCH; no pure black or white; every neutral tinted warm (hue ~50-78).

Neutrals:
- `--color-cream` `oklch(0.975 0.013 75)` — app background
- `--color-cream-deep` `oklch(0.955 0.018 73)` — recessed fills, active nav pill
- `--color-paper` `oklch(0.992 0.006 78)` — cards, sheets, chips
- `--color-ink` `oklch(0.28 0.014 55)` — primary text, primary buttons, FAB
- `--color-ink-soft` `oklch(0.4 0.018 52)` — secondary text
- `--color-brown` / `--color-brown-soft` — tertiary text, inactive nav
- `--color-line` `oklch(0.9 0.012 70)` — hairline borders

Theme hues (each expands at use into `--t`, `--t-bg`, `--t-wash`, `--t-ink`, `--t-edge` via `.theme-*`): blush (rose 18), butter (yellow 95), sage (green 145), sky (blue 248), lavender (violet 300), clay (warm 55).

Destructive: `--color-rosewood` `oklch(0.55 0.13 18)` — a dusty rose, warm not alarming.

Status tones (in `status-pill.tsx`, paired always with a label + glyph, never color alone): good (green ✓), bad (warm-red ✕), love (rose ♥), neutral (blue ○).

## Typography

- Display (`--font-display`): **Fraunces** (serif), used for `h1-h4`, letter-spacing `-0.015em`. Carries the cozy editorial warmth.
- Body (`--font-body`): **Nunito** (rounded sans), `ui-rounded` fallback. Friendly, soft.
- Emoji (`--font-emoji`): native color emoji first, Noto last.
- Hierarchy comes from the serif/sans split plus weight (Nunito is used heavy: semibold/bold for chips, labels, nav). Watch for flat scales between heading levels during polish.

## Elevation & Radius

Radii are generous and pillowy: `--radius-md` 0.875rem, `--radius-lg` 1.25rem, `--radius-xl` 1.75rem, `--radius-2xl` 2.25rem, `--radius-pill` 999px. Cards and sheets use `xl`/`2xl`; chips and pills use `pill`.

Shadows are soft and warm-tinted (oklch shadow color ~hue 60, low chroma):
- `--shadow-soft` — resting cards
- `--shadow-lift` — raised/floating (FAB, bottom nav, hover)
- `--shadow-sheet` — upward sheet shadow for bottom sheets

## Components

- **Cards** (list-card, person-card, poster-card, note-card, expandable-card): rounded-xl/2xl paper surfaces, soft shadow, theme wash, corner sticker. The `⋯` overflow menu sits top-right (portaled to escape `overflow-hidden`).
- **Chips** (`chip.tsx`): pill, three variants — `filter` (≥44px tap target; active = `bg-ink text-cream`, inactive = `bg-paper ring-line`), `tag` (paper + ring), `soft` (theme `--t-bg`/`--t-ink`).
- **Status pills** (`status-pill.tsx`): tone-tinted pill with glyph + label, sizes sm/md.
- **Bottom sheet** (`bottom-sheet.tsx`): scrim (`bg-ink/30` + 2px blur), spring slide-up, drag-to-dismiss, grab handle, `max-w-[440px]`, `maxHeight 92dvh`, safe-area bottom padding, Escape to close, body scroll lock.
- **Bottom nav** (`bottom-nav.tsx`): floating pill bar, `max-w-[420px]`, `backdrop-blur-md`, animated `layoutId` active pill, custom stroke icons. Note: outer wrapper has no safe-area inset yet.
- **Floating add button** (`floating-add-button.tsx`): 60px ink circle, `shadow-lift`, context-aware label + action, perpetual gentle bob.
- **Toast** (`toast.tsx`), **confirm sheet** (`confirm-sheet.tsx`), **view toggle** (`view-toggle.tsx`), **filter chips** (`filter-chips.tsx`), **empty state** (`empty-state.tsx`), **sticker** (`sticker.tsx`).

## Motion

- Springs/eases in `lib/motion.ts`; CSS eases `--ease-out-quint` and `--ease-out-expo` (exponential ease-outs, no bounce/elastic). Tap feedback via shared `tap`.
- Global `@media (prefers-reduced-motion: reduce)` zeroes CSS animation/transition durations. Note: JS-driven `motion/react` animations are not covered by that rule and must be guarded separately.
- Motion intent: subtle and meaningful, like placing a sticker. Reserve sparkle/celebration for genuine wins.

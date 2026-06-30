# Little Lists — UI/UX Polish Audit

Date: 2026-06-30 · Branch: `feat/ui-polish` (off `main`) · Method: 3 parallel code-audit agents (cards/lists/items, sheets/forms/nav, atoms/motion/a11y/copy) cross-checked against a live browser pass at 320 / 390 / 1280 px across every screen and the create/add/edit/confirm sheets. Grounded in `PRODUCT.md` + `DESIGN.md`.

## Anti-Patterns Verdict — PASS (does not look AI-generated)

This is a genuinely distinctive, intentional interface. Fraunces serif + Nunito rounded, a warm OKLCH cream/ink spine with six pastel per-surface themes, soft warm-tinted shadows, paper grain, corner stickers, and a consistent "little world" voice. None of the slop tells are present: no gradient text, no glassmorphism, no hero-metric template, no identical icon-card grids, no side-stripe accent borders, no pure-black-on-white SaaS chrome. It reads as a cared-for product, not a prototype. Two micro-exceptions (a `1.05` scale overshoot in `sparkle-burst`, an uppercase "YOUR THEME COLOR" label) are noted below but are not slop tells.

## Audit Health Score — 15/20 (Good; weak dimension = Accessibility)

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | App-wide missing `focus-visible`; input/label associations; 2 touch targets <44px; toast has no `aria-live`; reduced-motion gap |
| 2 | Performance | 3/4 | Clean; real posters use plain `<img>` not `next/image`; a few infinite JS animations |
| 3 | Theming | 3/4 | Excellent token system; ~6 components use pure `black`/`white` rings; a few magic radii/colors |
| 4 | Responsive | 3/4 | Solid at 320px; bottom-nav lacks safe-area inset; card-stack overflow risk at 320; 2 non-sticky sheet footers |
| 5 | Anti-Patterns | 4/4 | Distinctive, on-brand, no AI tells |

## The three systemic themes (fix these and most findings collapse)

1. **`focus-visible` is missing across the entire app.** Every interactive control — chips, status pills, theme swatches, nav links, sheet buttons, menu items, card `<Link>`s, the back button, CTAs, sign-out, welcome links, form inputs — either has no focus ring or uses `focus:` (fires on mouse) / `focus:outline-none` with only a faint border shift. This is the single biggest gap (WCAG 2.4.7). One shared pattern (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/50 focus-visible:ring-offset-1`, themed where appropriate) closes ~25 findings at once.

2. **~11 `motion/react` JS animations ignore `prefers-reduced-motion`.** The global CSS `@media (prefers-reduced-motion)` rule cannot touch Framer Motion's JS-driven animations. Unguarded: the FAB's perpetual bob (worst — continuous, WCAG 2.3.3), the bottom-sheet slide-up + scrim (inherited by all 9 sheets), the `soft-dot-loader` dots (shown on auth — a motion-sensitive user's first impression), `empty-state` float + twinkles, `sparkle-burst`, the three `layoutId` sliding pills (nav/filter/view), `riseItem` stagger entrances (home/people/profile/person), and the route `PageTransition`. Only `celebration.tsx` guards correctly. Fix: `useReducedMotion()` from `motion/react` at each site (or a small shared wrapper).

3. **Input labels & chip selection states are not programmatic.** `item-card`'s editor and three sheets (`add-item-modal`, `add-detail-sheet`, `edit-detail-sheet`) use `<p>` as visual labels with no `htmlFor`/`id` (WCAG 1.3.1); type/status/section chip groups lack `aria-pressed`; emoji/status/section button groups lack a group label.

## Findings by severity

### P0 / top-priority (accessibility blockers)
- **Toast has no `aria-live`/`role="status"`** (`toast.tsx:19`). It's the only feedback for every save/delete — screen-reader users hear nothing. Add `role="status" aria-live="polite"` to the always-present container.
- **FAB perpetual bob unguarded** (`floating-add-button.tsx:51-55`) — continuous motion, WCAG 2.3.3. Static when reduced.
- **Bottom-sheet slide-up/scrim unguarded** (`bottom-sheet.tsx:57-61`) — affects all 9 sheets.

### P1 (major / WCAG-AA)
- **`focus-visible` missing** on: chip, status-pill, theme-chip, person-detail-section (accordion + 4 edit/remove buttons), profile share, sign-out, welcome CTAs, list/person card `<Link>`s, all sheet primary buttons, overflow-menu items+trigger, view-toggle, filter-chips, detail-header back, all form inputs.
- **Input/label associations** missing: `item-card` (title/note/tags), `add-item-modal` (title + 3 details), `add-detail-sheet`, `edit-detail-sheet`.
- **Touch targets <44px**: person-detail remove buttons are 16px (`:76`) and 20px (`:105`).
- **Bottom-sheet:** no focus trap and no focus restore on close (`:18-27`).
- **Overflow-menu:** focus not moved to first item on open; `role="menu"` has no accessible name (`:60-96`).
- **Bottom-nav:** active link missing `aria-current="page"` (`:53-71`).
- **Home search input** has no `<label>` (`page.tsx:78-83`).
- **`soft-dot-loader` reduced-motion** (auth pages, first impression).
- **List page per-item entrance** fires for reduced-motion (`list/[id]/page.tsx:180-183`).
- **ProfileHeader "Share" is broken** (`profile-header.tsx:17`): fires confetti + shows "copied your little world ✨" but performs **no clipboard write**. False confirmation. (Touches the "no new sharing feature" boundary — see steering question.)

### P2 (minor / consistency)
- **Pure `black`/`white` rings** vs OKLCH tokens: `list-card`, `person-card`, `compact-row`, `note-card`, `poster-card`, `placeholder-poster` (`from-black`/`ring-white`), `add-item-modal`, `theme-chip`, `profile-header`. Standardize to `ring-line/*` or `ring-ink/*`.
- **`aria-pressed` missing** on type/status/section chip selectors (add-item-modal, add-detail, edit-detail).
- **`role="img"` missing** on aria-labelled stars/favorite/note `<span>`s (compact-row, poster-card).
- **Bottom-nav safe-area:** `mb-3` ignores `env(safe-area-inset-bottom)` — pill sits in the home-indicator gesture zone on modern iPhones.
- **Non-sticky sheet footers:** `create-person-sheet`, `edit-person-sheet` save buttons scroll below the fold on small phones (others are sticky).
- **Chip has no hover state and no `transition-colors`;** status-pill uses `active:scale-95` while chip uses `whileTap` (inconsistent press feedback).
- **EmptyState inconsistency:** "no lists match filter" renders a bare `<p>` while "no lists at all" uses `<EmptyState>`.
- **`layoutId` pills + profile/route stagger** unguarded for reduced-motion.
- **Magic numbers:** rating color `oklch(0.72 0.13 75)` (compact-row), toast/FAB paired offsets (`5.5rem`/`5.25rem`), `rounded-3xl`/`rounded-[32px]` vs `--radius-2xl`, `empty-state` cream-deep fallback.
- **Card-stack overflow risk** at 320px inside two-column list cards.

### P3 (polish)
- **Pluralization:** `listCountLabel` (`lib/visual.ts:43`) always appends the plural noun → "1 little films saved" on every single-item card/header/profile. (Empty copy is lovely.)
- **Copy:** "Save changes" (edit sheets) is flat vs the warm voice; "YOUR THEME COLOR" uppercase reads robotic (banned tone); add-item shows "No match…" on an empty query before the user types; "Continue" transitional label.
- **`sparkle-burst` scale `[0.4, 1.05, 0.7]`** has a 1.05 overshoot (against no-bounce rule) → use `[0.4, 1, 0.85]`.
- **`note-card` vs `compact-row` subtitle** weight/color mismatch.
- **`cover.tsx`** real posters via plain `<img>` (no `next/image` optimization).
- **`loading.tsx:6`** `min-h-[60vh]` → `60dvh`.
- **DRY:** emoji + theme pickers duplicated ~100 lines across `list-form-fields`/`person-form-fields` → extract `<EmojiPicker>`/`<ThemePicker>`.

## Positive findings (keep / replicate)
- Real, disciplined OKLCH token system with per-surface theming that animates smoothly.
- Warm voice is consistent and genuinely good ("waiting for its first little thing", "tuck in your own", "Remove this little list?" / "Keep it").
- Status meaning never relies on color alone (label + glyph + tone).
- `celebration.tsx` is the one component that correctly guards reduced-motion — the pattern to copy.
- Holds up cleanly at 320px with no horizontal overflow; sheets use `dvh` + safe-area bottom padding; Escape + scroll-lock on sheets.
- The Step 5 overflow-menu portal correctly escapes `overflow-hidden` (no clipping).
- No `console.log`/TODO/FIXME anywhere; all `console.error` are intentional error paths.

## Recommended command sequence (impeccable)
1. `$impeccable harden` — focus-visible system, label associations, aria-pressed/aria-current/role, touch targets, reduced-motion guards, toast aria-live (the P0/P1 a11y mass).
2. `$impeccable layout` / `polish` — pure-black/white ring cleanup, magic-number/radius tokenization, sticky footers, safe-area inset, hover states, EmptyState consistency.
3. `$impeccable clarify` — pluralization, "Save changes"/"No match"/uppercase-label copy.
4. `$impeccable polish` — final pass + re-audit.

---

## Resolution (2026-06-30, branch `feat/ui-polish`)

Fixed in three reviewed + browser-verified passes (full scope P0–P3):

- **`fef8a2a` a11y pass (39 files):** new `lib/a11y.ts` focus-ring system applied app-wide (30 files); `<p>`→`<label htmlFor>` associations on item-card + add-item + add/edit-detail; `role="group"`/`aria-label`/`aria-pressed`/`aria-current`/`role="img"`/listbox roles; overflow-menu focus management + menu name; person-detail remove buttons enlarged to ≥28px; `useReducedMotion()` guards on all 11 unguarded JS animations (FAB bob, sheet slide, layoutId pills, loaders, entrances, page transition); toast `role="status" aria-live="polite"`; **Share button now performs a real `navigator.clipboard.writeText` with prompt fallback.**
- **`4eb35a6` visual pass (20 files):** all pure `black`/`white` rings → warm tokens (`ring-line/*`, `ring-ink/*`, OKLCH); new `--color-rating` token; `rounded-3xl`/`[32px]`→`--radius-2xl`; `60vh`→`60dvh`; sticky footers on create/edit-person sheets; bottom-nav `env(safe-area-inset-bottom)`; chip hover + `transition-colors`; status-pill → `motion.button` `whileTap` for parity; home filter empty-state → `<EmptyState>`; card-stack capped at 3 thumbnails for 320px; sparkle overshoot `1.05`→`1.0`.
- **`b571d6a` copy+DRY pass (11 files):** pluralization via `nounSingular` per template → **"1 little film saved"**; "Save changes"→"Save it"; add-item empty query now shows "Start typing to find it ✨" (gated "No match"); `cover.tsx` migrated to `next/image` + TMDB `remotePatterns` (verified loading real posters); stray `cover.tsx` ring fixed; shared `EmojiPicker` extracted + both form-fields switched to the existing `ThemeColorPicker` (removes ~100 lines of duplication).

**Verification:** `tsc --noEmit` clean, `vitest` 21/21 after each pass. Browser-verified at 320/390/1280 across home, list (all 3 views + filter empty), people, person, profile, and the create/add/edit/confirm sheets: focus rings render, share copies, pluralization correct, `next/image` loads real TMDB posters, EmojiPicker/ThemeColorPicker selection wires through, no visual regressions, only console message is the pre-existing pg/SSL driver warning. No user data mutated.

**Deliberately NOT changed (by-design):** uppercase section eyebrow labels ("NAME YOUR LITTLE WORLD", "YOUR THEME COLOR") kept — they are a consistent intentional pattern, not robotic system copy. Desktop = centered mobile column (intentional). Confirm-sheet Delete/Keep-it hierarchy kept (iOS-style, deliberate).

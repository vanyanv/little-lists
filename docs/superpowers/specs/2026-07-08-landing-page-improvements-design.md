# Landing page improvements — design

Date: 2026-07-08
Status: approved

## Context

The use-cases section was just redesigned into the "Start with anything. Make it a little world." scrapbook showcase (uncommitted, on `main`'s working tree). This pass brings the rest of the landing page up to that quality bar. Scope decided with the user: **fix the collisions the new section created, redesign the weakest section ("See it your way"), and give the other sections targeted polish** — no layout churn on sections that already work. Copy may be tightened where it helps.

## 1. People collisions (fix)

Two collisions between the new showcase's people teaser and the existing `PeopleMemory` section:

- **Chip duplicate**: `SHOWCASE_PEOPLE_SCRAPS` in `lib/landing-data.ts` contains "no mushrooms, ever", which also appears in `PREVIEW_PERSON.sections` (rendered by `PeopleMemory`). Replace the showcase chip with **"her ring size, just in case"**.
- **Heading near-duplicate**: `PeopleMemory`'s H2 "Remember the little things about people" vs the teaser card's "Remember the little things". Retitle the section H2 to **"Every person gets their own little page"** (`components/landing/people-memory.tsx`). Body copy unchanged. The teaser card keeps its title (user-spec'd).

## 2. "See it your way" → interactive toggle demo (the big piece)

Rewrite `components/landing/view-modes.tsx`:

- Keep the section shell: `px-5 py-12`, `max-w-4xl`, copy-left / demo-right `md:grid-cols-2`. H2 and section copy unchanged.
- Replace the three stacked mini-preview rows with **one larger demo card** (paper background, `rounded-2xl`, `shadow-soft`, `ring-1 ring-line/40`):
  - Top: a real segmented control with three buttons — Grid / List / Cozy — reusing `ViewIcon` from `components/view-toggle.tsx`. Real `<button>`s with `aria-pressed`, `focusRing` from `lib/a11y`, thumb-friendly hit areas.
  - Body: the same four hand-drawn posters (`SAMPLE` array, `/posters/*.svg` — first-party art, no licensing concerns, no duplication now that the hero shows TMDB art) rendered in the active mode:
    - **grid**: 2×2 poster tiles
    - **list**: compact rows (poster thumb + title + theme dot)
    - **cozy**: cards with title + placeholder note lines
  - Caption line under the demo showing the active mode's one-liner (existing `MODES[n].line` copy, kept verbatim).
- **Morph, don't swap**: each item carries a Motion `layout` prop inside a shared `LayoutGroup` keyed by item title, so switching modes animates the same posters sliding/resizing between arrangements (`softSpring`). Text blocks that only exist in some modes fade in/out.
- **Auto-cycle**: advance the mode every ~3.5s while the demo is scrolled into view (`useInView`, same gating pattern as `components/landing/app-preview.tsx`), pause ~8s after a manual tap, never auto-cycle under reduced motion.
- **Reduced motion**: toggle still functional; modes swap with a plain crossfade (or instant), no layout animation, no auto-cycle.

## 3. Hero (light touch)

`components/landing/landing-hero.tsx`:

- Headline → **"Little lists for everything you love, hate, and want to remember."** (drop leading "Make").
- Nudge the headline clamp max down (3.4rem → ~3.1rem) so it sits at three lines on desktop.
- Nothing else changes.

## 4. Privacy (small warmth)

`components/landing/privacy.tsx`:

- Lock badge does a one-shot sticker-pop when the section scrolls into view (convert badge to `AnimatedCategoryIcon`-style play-on-inView; `lock` glyph exists, falls to `WHOLE_MOTION`/`STICKER_POP`). Requires making the section (or an inner island) a client component — keep the island as small as possible.
- Add a whisper of sage to the card wash so it isn't cream-on-cream (e.g. blend `bg-sage/15`-level tint into the existing `bg-cream-deep/60`).
- No layout change.

## 5. Final CTA (tiny)

`components/landing/final-cta.tsx`: the two decorative corner stickers (flower, sparkle) get `gentleFloat` drift, reduce-guarded (same pattern as hero stickers). Nothing else.

## 6. Header & footer

No changes.

## Non-goals

- No changes to the use-cases showcase (just shipped).
- No new sections, no testimonial/stat invention (the `FinalCta` placeholder comment stays).
- No changes to the app itself.

## Verification

- `npm run lint` (no new findings beyond the ~4 known pre-existing), `npx tsc --noEmit`, `npm run test`, `npm run build`.
- Playwright sweep at 320 / 375 / 390 / 430 / 768 / 1280: zero horizontal overflow; sections render fully after slow-scroll.
- Toggle demo: clicking each mode rearranges the same items; auto-cycle runs when in view, pauses after manual interaction; keyboard-operable with visible focus and correct `aria-pressed`.
- Reduced-motion emulation: no auto-cycle, no layout morph, all content visible.
- Fresh-load console clean in normal and reduced modes.

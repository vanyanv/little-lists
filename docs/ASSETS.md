# Icons, stickers & visual assets

Little Lists has one cohesive glyph system — a hand-drawn, flat-pastel SVG set
in the app's "Soft Collectible Scrapbook" style. Native emoji appear only as
**user-chosen content** (a list's, person's or item's "face", the profile
avatar, and the emoji pickers) — never as app iconography.

## Where everything lives

| Piece | File | Role |
|---|---|---|
| `GLYPH_ART` registry | `components/icons/glyphs.tsx` | every drawn shape, keyed by `GlyphName` — **the single asset-swap point** |
| `LittleIcon` | `components/icons/little-icon.tsx` | core renderer: `plain` / `badge` / `sticker` variants, rare `animated` opt-in |
| `CategoryIcon` | `components/icons/category-icon.tsx` | category id → glyph (`CATEGORY_GLYPH`), used by chips, pickers, section headers |
| `StickerBadge` | `components/icons/sticker-badge.tsx` | the unified tile frame for user-chosen emoji |
| `AnimatedSticker` | `components/icons/animated-sticker.tsx` | floating halo + twinkles for empty states / onboarding |
| `SaveSparkle` | `components/icons/save-sparkle.tsx` | brief drawn sparkle pop on save moments |
| `Sticker` (deprecated) | `components/sticker.tsx` | thin shim over `LittleIcon variant="plain"` for legacy call sites |

Guard test: `lib/icons.test.ts` fails if a category id loses its glyph or a
mapping points at art that doesn't exist.

## Drawing rules

- 24×24 viewBox, flat `oklch()` pastel fills, soft shapes, no gradients.
- **Pictorial** glyphs (film, gift, tulip…) use fixed pastel colors so they look
  identical everywhere.
- **Functional** glyphs (check, cross, circle, star-tiny, heart-tiny) use
  `currentColor` and inherit the surrounding text/pill color. They're listed in
  `FUNCTIONAL_GLYPHS` and must not be used as decoration.
- Animation is rare by design: empty states, onboarding, the save moment,
  milestone celebrations, and the picker character moves (see Motion rules).
  Everything animated goes through `useReducedMotion`.

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

## Swapping in third-party assets later

To move to Twemoji / Animated Noto Emoji SVGs or LottieFiles stickers:

1. Add the asset files under `public/icons/<set>/` (never hotlink).
2. Replace the relevant `GLYPH_ART` entries (or teach `GlyphSvg` to render an
   `<image>`/Lottie player for those names). Look for the `TODO(asset-swap)`
   comments in `glyphs.tsx` and `animated-sticker.tsx`.
3. Record the source + license in the attribution table below. Only use assets
   with a clear license (Twemoji graphics are CC-BY 4.0 → attribution required;
   Noto Emoji is OFL/Apache; check each Lottie file individually).
4. Animated vendor stickers (Lottie / Animated Noto) would replace
   `glyph-motion.ts` and `AnimatedCategoryIcon`'s renderers — nothing else
   consumes the motion layer.

## Third-party asset attribution

| Asset | Source | License | Used for |
|---|---|---|---|
| *(none)* | — | — | all current art is first-party, drawn for this project |

# Design-Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every finding from the 2026-07-06 design/UX audit (P0 → nice-to-haves) so Little Lists ships warm, accessible, and bug-free.

**Architecture:** Surgical fixes inside the existing token/component system — no redesign, no new design language. Two small Prisma migrations (List.pinned, Person.specialDay). Work happens on branch `design-audit-fixes`, edits in place (dev server hot-reloads for live verification).

**Tech Stack:** Next.js 16 (Turbopack) App Router, React, Tailwind v4 `@theme` tokens, motion/react, Clerk v7, Prisma + Neon Postgres, Vitest.

## Global Constraints

- **This is NOT the Next.js you know.** Read the relevant guide in `node_modules/next/dist/docs/` before writing code that touches routing, metadata, server actions, or data fetching.
- **No em dashes in any user-facing copy** (also not `--`). Use periods, commas, or `·`.
- **No pure `#000`/`#fff`; no side-stripe borders; no gradient text; no robotic labels** ("Submit", "No data", "Manage").
- **All colors/radii/shadows through `@theme` tokens in `app/globals.css`** unless technically impossible (canvas, Clerk vars) — then comment linking to the token.
- Voice: warm, adult, "little world / little thing" register. When in doubt, copy the tone of existing strings in `lib/types.ts`.
- Motion: exponential ease-outs only; any new JS animation must respect reduced motion (Task 2 adds a global `MotionConfig`).
- Touch targets ≥44px (visual size may be smaller; extend hit area). Readable text ≥12px (0.75rem).
- After each task: `npm run lint` (7 pre-existing errors are tolerated — do not add new ones), `npm run test`, and commit with a conventional message.
- Audit context (file:line refs for every finding) lives in the conversation and in `~/.claude/projects/-home-vardan-little-lists/memory/design-audit-2026-07.md`.

---

## Wave 0 — setup

### Task 0: Branch

- [ ] `git -C /home/vardan/little-lists checkout -b design-audit-fixes`

---

## Wave 1 — parallel, file-disjoint tasks

### Task 1: Contrast + touch-target + text-size sweep (design tokens & small components)

**Files:** Modify `app/globals.css`, `components/view-toggle.tsx`, `components/overflow-menu.tsx`, `components/person-detail-section.tsx`, `components/demo-banner.tsx`, `components/getting-started-card.tsx`, `components/bottom-nav.tsx`, `components/filter-chips.tsx`, `components/compact-row.tsx`, `components/status-pill.tsx`, `components/app-shell.tsx` (shadow token only), `app/app/onboarding/layout.tsx` (shadow token only).

- [ ] In `@theme`: `--color-brown: oklch(0.52 0.035 50)` (was 0.56 — brings body text ≥4.5:1 on cream), `--color-brown-soft: oklch(0.55 0.032 53)` (was 0.68 — micro-labels/nav/subtitles reach AA), `--color-rating: oklch(0.63 0.13 75)` (was 0.72 — ≥3:1 non-text). Visually verify on the running dev server that the palette still reads warm, not muddy; nudge chroma ±0.005 if needed.
- [ ] Promote the duplicated phone-frame shadow (`app-shell.tsx:42`, `onboarding/layout.tsx:20`) to a token `--shadow-frame: 0 0 70px oklch(0.5 0.05 60 / 0.14)` and use `shadow-frame` in both.
- [ ] Promote the 8 status-tone literals in `status-pill.tsx:12-15` into `@theme` tokens (`--color-status-good-bg`, `--color-status-good-ink`, etc.) and reference them.
- [ ] 44px hit areas (keep visual size; extend with padding/negative margin or an absolutely-positioned `before:` overlay): view-toggle segments (`view-toggle.tsx:75`, currently `h-8 w-8`), overflow trigger (`overflow-menu.tsx:130`, 36px), person-detail edit/delete buttons (`person-detail-section.tsx:81,110`, 28px), demo-banner dismiss (`demo-banner.tsx:51`), "Hide this" (`getting-started-card.tsx:34`).
- [ ] Text floor: bottom-nav labels `text-[0.68rem]` → `text-[0.75rem]` (`bottom-nav.tsx:73`); the `0.72rem` pill family (`person-card.tsx:68`, `note-card.tsx:42`, `profile-header.tsx:48`, `status-pill.tsx:29` sm, `list-form-fields.tsx:93,150,168`) → `0.75rem`. Filter-chip count badge (`filter-chips.tsx:52`): add `aria-hidden="true"` (the button's accessible name already contains the count) and bump to `text-[0.7rem]`.
- [ ] Bottom-nav route match: `p.startsWith("/app/list")` → `p.startsWith("/app/list/")` (`bottom-nav.tsx:41`).
- [ ] Verify: with dev server running, eyeball home/list/profile; run a quick contrast check of new tokens (relative luminance math or a one-off node script) confirming brown ≥4.5:1 on cream (`oklch(0.975 0.013 75)`) and brown-soft ≥4.5:1 on paper.
- [ ] Commit: `fix(a11y): AA contrast for brown text ramp, 44px hit areas, 12px text floor`

### Task 2: Motion + sheet focus management

**Files:** Modify `components/app-shell.tsx`, `components/bottom-sheet.tsx`, `components/add-item-modal.tsx` (back-button focus ring only, ~line 409).

- [ ] Wrap the app tree in `<MotionConfig reducedMotion="user">` (import from `motion/react`) inside `AppShell`'s `UiProvider`. Also wrap the onboarding layout's tree if it doesn't render through AppShell. Leave existing `useReducedMotion` guards in place (harmless).
- [ ] `bottom-sheet.tsx`: on open, save `document.activeElement`, move focus to the sheet container (`tabIndex={-1}`) unless a child has `autoFocus`; trap Tab/Shift+Tab within the sheet (query focusable elements, wrap at edges); on close, restore focus to the saved element. Escape already works — keep it.
- [ ] `add-item-modal.tsx` back button (~line 409): add the shared `focusRing` class from `lib/a11y.ts` and `rounded-pill`.
- [ ] Verify: keyboard-only pass on the dev server — open create-list sheet, Tab cycles inside, Escape closes, focus returns to the FAB.
- [ ] Commit: `fix(a11y): global MotionConfig, focus trap + restore in bottom sheets`

### Task 3: Cards stop nesting buttons inside links

**Files:** Modify `components/list-card.tsx`, `components/person-card.tsx`, `components/card-stack.tsx` (aria-hidden nit).

- [ ] Stretched-link pattern: make the card root `relative`; the `<Link>` wraps only the (visually hidden or title) content with an absolutely-positioned `after:absolute after:inset-0` overlay; `OverflowMenu` becomes a *sibling* of the link with `relative z-[1]` so it sits above the overlay. No behavior change for pointer users; keyboard/SR get valid, separate tab stops.
- [ ] `card-stack.tsx:30`: add `aria-hidden="true"` to the decorative `＋` span.
- [ ] Verify: Tab order on home = card link, then its menu button; menu opens without navigating. `npm run lint`.
- [ ] Commit: `fix(a11y): stretched-link cards so overflow menus are not nested in links`

### Task 4: Auth — Clerk copy + token comments

**Files:** Modify `app/layout.tsx` (or wherever `ClerkProvider` mounts), `lib/clerkAppearance.ts`.

- [ ] Add a `localization` object to `ClerkProvider` overriding the stock strings (check `@clerk/nextjs` v7 localization key names in `node_modules/@clerk/localizations` types):
  - signUp start title: `"Make yourself at home"`; subtitle: `"A name, an email, and you're in."`
  - signIn start title: `"Welcome back"`; subtitle: `"Your little worlds are waiting."`
  - username placeholder: `"a name you like"`; email placeholder: `"you@somewhere.com"`; password placeholder: `"something only you know"`
  - verification code subtitle: keep informative but warm: `"We sent a little code to your email"`
  - Do not translate error strings (keep Clerk defaults for correctness).
- [ ] `clerkAppearance.ts:15-22`: add a comment block mapping each hex to its `globals.css` token name (Clerk variables can't read CSS vars in all slots; document the linkage).
- [ ] Verify: sign-out state, load `/sign-up` and `/sign-in`, confirm strings render and nothing falls back to English-key gibberish.
- [ ] Commit: `feat(auth): warm Clerk localization, token linkage comments`

### Task 5: Landing page fixes

**Files:** Modify `app/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `components/landing/landing-footer.tsx`, `components/landing/landing-hero.tsx`, `components/landing/final-cta.tsx`, `components/landing/view-modes.tsx`, `components/landing/use-cases.tsx`, `components/landing/app-preview.tsx`, `components/landing/landing-header.tsx`.

- [ ] Footer attribution (muted, small, above the "Made with care" line): `"Poster and cover art from TMDB and Open Library. This product uses the TMDB API but is not endorsed or certified by TMDB."`
- [ ] Metadata titles: `"Little Lists — cozy little lists for everything you love"` → `"Little Lists · cozy little lists for everything you love"` (`app/page.tsx:13`); same `—` → `·` in `privacy/page.tsx:5`, `terms/page.tsx:5`.
- [ ] CTA voice: header button `"Start"` → `"Start free"` (`landing-header.tsx:32`); final CTA `"Create my Little Lists"` → `"Start your first little list"` (`final-cta.tsx:40`).
- [ ] Hero: `"See how it works"` → `"See what you can make"` (`landing-hero.tsx:113`); headline clamp floor `2.05rem` → `1.85rem` so both CTAs fit above the fold at 320px (`landing-hero.tsx:90`).
- [ ] `use-cases.tsx`: under the section intro add one plain line selling the magic: `"Type a title and the poster appears. No pasting links."`
- [ ] `view-modes.tsx`: Cozy line → `"For thoughts, opinions, and anything freeform."` (:22); intro comma-splice → `"Pick whatever feels right for what's inside. Same little world, just rearranged."` (:97); replace the 🎬🍿🌀🎀 emoji tiles (:12-17) with the drawn `/posters/*.svg` art already used by the hero demo (tiny `Cover`/img tiles).
- [ ] `app-preview.tsx`: replace hardcoded `"4 little films saved"` (:44) with `listCountLabel(list)` (already used by `preview-card.tsx`); give the Profile nav glyph a distinct path from People (:140,144); tighten the empty pink region between the poster grid and the bottom nav inside the demo phone (reduce the demo screen's fixed height or add a third row of content).
- [ ] Verify: `npm run lint`; dev server at 320px and 1280px — hero CTAs above the fold at 320, no horizontal overflow, attribution visible.
- [ ] Commit: `fix(landing): attribution, CTA voice, 320px fold, drawn art in view modes`

### Task 6: Error/404/loading polish

**Files:** Modify `app/app/error.tsx`, `app/not-found.tsx`, `app/app/(main)/list/[id]/page.tsx` (hydration wait only, ~lines 94-96), `app/app/(main)/person/[id]/page.tsx` (hydration guard).

- [ ] `error.tsx` + `not-found.tsx`: swap raw emoji (🌧️ / 🍃) for the house `<AnimatedSticker>` (pick fitting glyphs from `components/icons/glyphs.tsx`, e.g. leaf/cloud/sparkle). Add a `"Back to your lists"` link (to `/app`) alongside error.tsx's `"Try again"`.
- [ ] `list/[id]/page.tsx:94-96`: replace the blank `<div className="min-h-dvh" aria-hidden />` hydration wait with `<SoftDotLoader label="opening this little world" />` centered.
- [ ] `person/[id]/page.tsx`: add the same hydration guard the list page has (currently risks flashing "We can't find that person" on direct load, line ~23) + the same SoftDotLoader treatment. Also soften the not-found copy: `"We can't find that person"` → `"Hmm, we can't find that person"` and add a hint line matching the list page's.
- [ ] Verify: hard-refresh a list URL and a person URL on the dev server — loader shows, no blank flash, no false "can't find".
- [ ] Commit: `fix(states): house stickers on error/404, loader instead of blank hydration waits`

### Task 7: Profile simplification

**Files:** Modify `app/app/(main)/profile/page.tsx`, `components/profile-header.tsx`, `lib/server/serialize.ts`.

- [ ] `serialize.ts:114-121`: fallbacks become neutral — `name: row.displayName?.trim() || "friend"`, `handle: row.handle?.trim() || ""`, `bio: row.bio?.trim() || ""`, drop `FALLBACK_BIO`. Keep `avatarEmoji: "🌙"` as the default avatar (it's fine as a house default).
- [ ] `profile-header.tsx`: remove the Share button + its celebration (:19-28, :89) entirely; hide the handle line when `handle` is empty (:47); keep the "Just for me" badge.
- [ ] `profile/page.tsx`: remove the quoted fallback bio and the tags row; remove the "Featured little worlds" section (:26, :79-80) — it silently showed the 3 newest lists with no way to feature. Keep: identity card, "A few things you love" (works), theme color picker, sign out. Kicker `"Your taste profile 🌙"` → `"Your little corner 🌙"` (:41).
- [ ] Verify: profile on dev server shows no "@vardan", no Share, no Featured; theme picker + sign out still work.
- [ ] Commit: `fix(profile): remove aspirational scaffolding, neutral fallbacks, no fake share`

### Task 8: Onboarding flow fixes

**Files:** Modify `components/onboarding/onboarding-flow.tsx`, `lib/onboarding.ts`, `lib/actions.ts` (seeding), `components/demo-banner.tsx`, `components/getting-started-card.tsx` (if checklist logic lives there), `lib/server/data.ts` or wherever `deriveChecklist` reads rows.

- [ ] Welcome-step error visibility: hoist the error `<p role="alert">` (currently only in the `pick` branch, :185-189) so it renders on every step.
- [ ] Persist `step` + `picked` + examples toggle to `sessionStorage` (`ll:onboarding-state`); restore on mount; clear on completion. Guard JSON.parse with try/catch.
- [ ] `MIN_STARTERS` 2 → 1 (`lib/onboarding.ts:112`); update helper copy `"Pick at least 2 to begin"` → `"Pick one or more to begin"` and `"two to four feels just right"` → `"one to four feels just right"`.
- [ ] Demo person seeds **only when picked**: `lib/actions.ts:368` `seedPerson = sel.includePerson || sel.seedExamples` → `seedPerson = sel.includePerson`.
- [ ] Tag every seeded example ListItem with `tags: ["example"]` (in the seed data in `lib/onboarding.ts`); render items with the `example` tag with a small soft chip `"example"` in all three views (touch `item-card.tsx`/`compact-row.tsx`/`note-card.tsx` minimally — a shared tiny `<ExampleChip>` in `components/chip.tsx` is fine).
- [ ] `demo-banner.tsx`: add a second quiet action `"Clear examples"` that calls a new server action `clearExamplesAction` (delete this user's ListItems where `tags` has `"example"`), then dismisses the banner. Banner copy `"Starter ideas added — make them yours or delete them anytime 🌿"` → `"We tucked in a few starter ideas. Make them yours, or clear them anytime 🌿"`.
- [ ] Checklist counts only non-example rows: wherever `deriveChecklist` (`lib/onboarding.ts:157-175`) counts items/details, exclude rows tagged `"example"` so the getting-started card is useful for example-seeded users too.
- [ ] Em dashes: `:117` → `"Everything here is private by default. This little world is just yours 🌙"`; `:141` → `"Pick a few little lists to start with. One to four feels just right."`; `:187` → `"Something went sideways. Mind trying again?"`.
- [ ] Ready-screen CTA: keep `"Take me to my little worlds"` and the 🌷 on one line (wrap emoji + last word in `whitespace-nowrap`, or drop the emoji).
- [ ] First-run race: in `ensureProfileForClerkUser` (find it in `lib/server/`), catch the P2002 unique-violation and immediately re-query + return the existing row instead of failing the request. In `app/app/(main)/layout.tsx`, if the profile row is missing entirely (fresh signup, ensure still failed), `redirect("/app/onboarding")` instead of rendering home with `FALLBACK_PROFILE`. Make `FALLBACK_PROFILE` neutral: `name: "friend"`, `handle: ""`, empty bio (:16-19) — greeting falls back to `"Hi there ✨"` when no real name resolves (adjust `page.tsx:78` if needed).
- [ ] Vitest: add `lib/onboarding.test.ts` covering `deriveChecklist` excluding example-tagged rows and `MIN_STARTERS === 1`. Run `npm run test` — expect pass.
- [ ] Verify (full flow): reset with `echo 'UPDATE "Profile" SET "onboardingCompleted"=false, "demoSeeded"=false, "checklistDismissed"=false;' | npx prisma db execute --stdin`, walk onboarding on the dev server as the existing test user; confirm no Sam unless picked, example chips visible, clear-examples works.
- [ ] Commit: `fix(onboarding): opt-in demo person, example labeling, resilient first run`

---

## Wave 2 — sequential (shared files: lib/types.ts, item-card, add-item-modal, list page, lib/ui)

### Task 9: Toast actions (undo infrastructure)

**Files:** Modify `lib/ui.tsx`, `components/toast.tsx`.

**Interfaces — Produces:** `showToast(message: string, opts?: { action?: { label: string; onAction: () => void } })` — existing single-arg calls stay valid. Toast with an action stays 6s (2.4s otherwise).

- [ ] Extend the toast state in `lib/ui.tsx:44` to carry the optional action; extend `toast.tsx` to render a small underlined pill button after the message text (44px hit area, `focusRing`), which calls `onAction` then dismisses.
- [ ] Verify: temporary call with an action from any screen, then remove; lint clean.
- [ ] Commit: `feat(ui): toast actions for undo`

### Task 10: Item editor — statuses (P0), debounce, ratings, copy

**Files:** Modify `components/item-card.tsx`, `lib/types.ts`, `app/app/(main)/list/[id]/page.tsx` (prop pass), `lib/store.tsx` (debounce), `components/compact-row.tsx` (rating display unchanged). Test: `lib/types.test.ts`.

**Interfaces — Produces:** `ItemEditor` accepts `statuses: Status[]` (the owning list's template statuses via `statusesForList(list)`).

- [ ] **Failing test first** (`lib/types.test.ts`, vitest): for each template, assert `statusesForList` returns the set used by its filter chips, and assert `STATUSES_FOR.food` includes the positive statuses (`love`, `maybe`, `need-to-try`) alongside the negatives. Run `npm run test` — expect the food assertion to FAIL.
- [ ] Fix `STATUSES_FOR.food` (`lib/types.ts:122`) to the full food-template set; make `ItemEditor` take `statuses` as a prop instead of reading `STATUSES_FOR[item.type]` (`item-card.tsx:23`); pass `statusesForList(list)` from the list page. Grep for other `STATUSES_FOR` consumers and reconcile. Test passes.
- [ ] Debounced persistence: title/note/tags inputs keep local state, dispatch `updateItem` optimistically to the store, but the server action fires on blur or after 600ms idle (single trailing call), not per keystroke (`item-card.tsx:33,86,97`, `lib/store.tsx:211-228`). Flush pending write on editor close/unmount.
- [ ] Ratings become settable: a soft 5-star row in the editor (reuses `--color-rating`; tap star N sets rating, tap current rating clears; each star ≥44px hit area, `aria-label="Rate N of 5"`). CompactRow display (`compact-row.tsx:31-42`) now reflects an editable value.
- [ ] Copy: editor `"tags (optional)"` → `"little labels (optional)"` with placeholder `"like a person, a mood, a someday…"` (`item-card.tsx:93`); `"DNF"` → `"Didn't finish"` (`lib/types.ts:87`).
- [ ] Tap-to-edit affordance: add a small soft `⋯`-style corner hint or a subtle "edit" pencil that appears on the card (visible, not hover-only) so expanding is discoverable (`item-card.tsx:176-180`).
- [ ] Verify: in a gift list on the dev server, edit an item — statuses match the list's chips; type a note — network tab shows one write on pause, not per keystroke; set a rating in a book list.
- [ ] Commit: `fix(items): editor uses list-template statuses, debounced writes, settable ratings`

### Task 11: Add-item modal — dead end, search feel, music

**Files:** Modify `components/add-item-modal.tsx`, `lib/types.ts` (personalized prompts).

- [ ] Empty-results dead end: in searchable lists, render a primary-soft button `` `Add "${query}" anyway` `` below the empty state, calling the existing `continueManual` with the typed text (`add-item-modal.tsx:304, 329-331`). New empty-state copy: `"No match out there. Tuck it in by hand?"`
- [ ] Distinguish errors from no-results: on fetch failure (`:112-113`) show `"Search is napping. Add it by hand below 🌿"` with the same add-anyway button.
- [ ] No flash while typing: keep previous results rendered (dimmed, `opacity-60 pointer-events-none`) while `searching` instead of replacing them with the loader (`:249-251`).
- [ ] Add `"music"` to the global `TYPES` picker (`:29`) with the house headphones/music glyph.
- [ ] Personalized headings in `lib/types.ts`: `"Add a movie to this little list."` → `` `Add a movie to ${title}.` `` (:259) and same for book (:273), music (:287), food (:301), date (:346) — matching how place/gift already do it (:316, :331).
- [ ] Em dash: `"That didn't save — let's try again 🌿"` → `"That didn't save. Let's try again 🌿"` (`:185`).
- [ ] Verify: movie list on the dev server — search gibberish (`zzqqxx`) → add-anyway path works; search "Padd", results stay visible while typing more; music addable from home FAB.
- [ ] Commit: `fix(add-item): manual fallback for empty search, stable results, music everywhere`

### Task 12: List detail — view persistence, undo, large lists, sticky bar

**Files:** Modify `app/app/(main)/list/[id]/page.tsx`, `components/item-card.tsx` (delete path only), `components/view-toggle.tsx` (no size work — done in Task 1).

- [ ] View rehydration: re-derive the current view once when `list` first becomes available after hydration (`page.tsx:33-47` — e.g. `useEffect` keyed on `hydrated && list?.id`), so a refreshed Grid list opens in Grid.
- [ ] Item delete gets undo instead of confirm: remove the ConfirmSheet for single-item removal (`item-card.tsx:109-119`); optimistic delete + `showToast("Removed from this little list", { action: { label: "Undo", onAction: restore } })` where `restore` re-creates the item with its previous fields via the existing add/update actions. Keep ConfirmSheet for whole-list deletion.
- [ ] Copy: item-delete toast `"Removed from your little world"` → `"Removed from this little list"`.
- [ ] Large lists: skip `layout` animation on the item wrapper when `items.length > 40` (`page.tsx:170-180`); add `content-visibility: auto` (via a utility class) to List-view rows. When `items.length > 30`, show a small search-within-list input in the sticky bar (client-side title/note filter, same warm placeholder style: `"Find a little thing…"`).
- [ ] Sticky bar: fade from `var(--t-bg)` to cream instead of flat `bg-cream/85` so the themed header hand-off isn't abrupt (`page.tsx:129`).
- [ ] Verify: refresh a Grid list — stays Grid; delete an item — undo restores it; a 35+ item list (create via UI or SQL) shows search field and scrolls smoothly.
- [ ] Commit: `fix(list): view persists on refresh, undoable deletes, graceful large lists`

---

## Wave 3 — parallel again (home/create/people/schema)

### Task 13: Home — music chip, pinning, FAB label, ordering

**Files:** Modify `prisma/schema.prisma` (List.pinned), `app/app/(main)/page.tsx`, `components/list-card.tsx` (menu item), `components/floating-add-button.tsx`, `lib/server/data.ts`, `lib/actions.ts` (togglePin action), `lib/store.tsx`.

- [ ] Migration: add `pinned Boolean @default(false)` to `List`; run `npx prisma migrate dev --name list-pinned` from the repo root (uses the unpooled Neon URL via `prisma.config.ts`), then `npx prisma generate` and `rm -rf .next/types .next/dev/types`.
- [ ] Overflow menu on list cards gains `"Pin to top"` / `"Unpin"` (server action + optimistic store update).
- [ ] Home ordering: pinned first, then `updatedAt` desc (`lib/server/data.ts:28`). Hero card = the first pinned list; when no list is pinned, keep newest-first with hero. **While searching or a category chip ≠ Everything is active, render a uniform grid (no hero)** so the layout stops reshuffling (`page.tsx:72,157-161`).
- [ ] Add a `"To hear"` category chip mapping to `music` (`page.tsx:22-28`) with the house music glyph; give `"Everything"` a tiny sparkle glyph so the row starts balanced.
- [ ] Search also matches template label: `matchesQuery = title.includes(q) || templateLabel(list).includes(q)` (`page.tsx:67`).
- [ ] FAB on Home only: extended pill with visible text `"Start a little list"` + the plus glyph (keep the 60px circle on all other screens; `floating-add-button.tsx:23-29` already knows context). Keep the gentle bob.
- [ ] Verify: pin a list — it heroes; filter by chip — uniform grid; music list appears under "To hear"; FAB reads as a labeled pill on home, circle elsewhere.
- [ ] Commit: `feat(home): pinning, music chip, labeled FAB, stable filtered grid`

### Task 14: Create/edit list sheets — fewer decisions, template descriptors

**Files:** Modify `components/create-list-sheet.tsx`, `components/edit-list-sheet.tsx`, `components/list-form-fields.tsx`.

- [ ] Remove the view-mode section from the **create** sheet only (template default applies silently; the list screen's toggle and the edit sheet keep it). Create shows three decisions: starting point, name, vibe (emoji + color).
- [ ] One-line descriptor under the template rail describing the active pick (`list-form-fields.tsx:121-153`), exact strings:
  - custom: `"Any shape you like. Start from a blank page."`
  - movie: `"Search real films, collect the posters."`
  - book: `"Search real books, keep the covers."`
  - music: `"Search albums and artists, save the art."`
  - food: `"Dishes, snacks, strong opinions."`
  - place: `"Spots to wander into, near or far."`
  - gift: `"Ideas for someone, before you forget. Adds a who's-it-for."`
  - date: `"Little plans worth looking forward to."`
  - people: `"The details that make someone feel seen."`
- [ ] Copy: edit-sheet toast `"Updated ✨"` → `"All tucked in ✨"` (`edit-list-sheet.tsx:57`); create-sheet error em dash → `"That didn't save. Let's try again 🌿"` (`create-list-sheet.tsx:86`); if the view section survives in edit, relabel `"how you'll browse it"` → `"how it lays out"` (`list-form-fields.tsx:175`).
- [ ] Verify: create sheet shows 3 sections + descriptor updates as templates change; edit sheet still offers view; both save.
- [ ] Commit: `feat(create): three-decision create sheet with template descriptors`

### Task 15: People — privacy line, prompts, per-section add, their day

**Files:** Modify `prisma/schema.prisma` (Person.specialDay), `components/add-detail-sheet.tsx`, `components/edit-detail-sheet.tsx`, `app/app/(main)/person/[id]/page.tsx`, `components/person-detail-section.tsx`, `components/person-form-fields.tsx`, `app/app/(main)/people/page.tsx`, `components/create-person-sheet.tsx`, `components/person-card.tsx`, `lib/actions.ts`.

- [ ] Migration: `specialDay String?` on `Person` (format `"MM-DD"`); `npx prisma migrate dev --name person-special-day`; regenerate + clear stale types (same as Task 13).
- [ ] Person form gains an optional `"their day (optional) 🎂"` control: month `<select>` (Jan–Dec) + day number input styled with `lib/field.ts`, serialized to `"MM-DD"`, clearable. Placeholder-coherence fix: name placeholder → `"Maddie, Mom, Sam from work…"` (`person-form-fields.tsx:43`).
- [ ] People page: when any person's specialDay lands within the next 14 days (client-side compute), a quiet banner: `"{emoji} {name}'s day is coming up 🎂"` (dismiss per-occurrence to localStorage `ll:day-nudge-{personId}-{year}`).
- [ ] Privacy where it matters: one small line at the bottom of the add-detail sheet: `"Only you can see this."` (reuse the "Just for me" tone; brown-soft, centered).
- [ ] Empty person page gets 3 tappable starter prompts opening the add sheet pre-set to the section: `"What do they always order? 🍴"` (food), `"A gift idea before you forget 🎁"` (gifts), `"Something they said they'd love to watch 🎬"` (movies).
- [ ] Per-section add: a small `"+ add"` ghost chip at the end of each filled section's chip row, opening the sheet with that section preselected (`person/[id]/page.tsx:79-105`).
- [ ] Remove the tags inputs from add/edit detail sheets (`add-detail-sheet.tsx:106-113`, `edit-detail-sheet.tsx:111-118`) — data column stays, UI goes until tags render somewhere. Edit sheet uses the drawn `AnimatedCategoryIcon` like add (`edit-detail-sheet.tsx:85`) and inherits add's richer placeholders.
- [ ] Copy: person delete confirm `"This will delete them and every little detail you saved."` → `"This clears their page and every little detail you kept."` (`person/[id]/page.tsx:47`, `person-card.tsx:42`); person-deleted toast → `"Gone, along with their little details"` (keep the plain string for detail deletion); create-person error em dash → period (`create-person-sheet.tsx:57`); add-detail error em dash → period (`add-detail-sheet.tsx:55`).
- [ ] Verify: add a person with a special day 5 days out (adjust date math or DB row) — banner shows; empty person shows prompts; per-section add preselects; no tags fields anywhere.
- [ ] Commit: `feat(people): their-day nudges, starter prompts, per-section add, privacy line`

---

## Wave 4 — final sweep + verification

### Task 16: Copy/consistency sweep + type scale

**Files:** Modify any stragglers found by grep; `lib/field.ts` or a small shared constant for sheet headings.

- [ ] Grep the repo for remaining user-facing `—` and `--` (exclude code/comments/CSS): `grep -rn "—" app components lib --include='*.tsx' --include='*.ts'` — fix all user-facing hits with periods/commas/`·`.
- [ ] Sheet-heading scale: unify main sheet `h2`s on one size (1.5rem) and secondary sheet headings on 1.35rem (currently 1.5/1.45/1.4/1.35 drift across `create-list-sheet.tsx:92`, `edit-list-sheet.tsx:62`, `add-item-modal.tsx:200,425`, `add-detail-sheet.tsx:61`, `edit-detail-sheet.tsx:70`, `confirm-sheet.tsx:15`, `empty-state.tsx:26`). A shared `sheetTitle` class string in `lib/field.ts` keeps it DRY.
- [ ] Confirm no new lint errors beyond the 7 pre-existing; `npm run test` green.
- [ ] Commit: `chore(polish): em-dash sweep, unified sheet heading scale`

### Task 17: End-to-end re-verification (the 10/10 gate)

- [ ] `npm run lint` (≤7 pre-existing errors), `npm run test` (green), `npm run build` (clean).
- [ ] Reset onboarding for the test user (`UPDATE "Profile" SET ...` per the verify skill) and walk the full flow in Playwright at 390px: signup-fresh → onboarding (pick 1 list, no examples) → home → create a gift list → add item → edit statuses (must match chips) → delete + undo → person + detail → profile (no @vardan, no Share).
- [ ] Viewport sweep: 320 / 375 / 390 / 430 / 768 / 1280 on home, list, person, landing — no horizontal overflow, CTAs above fold at 320 on landing, desktop gutters render cream (re-check the black-gutter artifact on a real browser if it persists in headless).
- [ ] Contrast spot-check the new tokens in the running app (computed styles → relative luminance ≥4.5:1 for brown/brown-soft text on cream/paper).
- [ ] Re-run the automated detector: `npx impeccable --json app components` — expect no new findings.
- [ ] Fix anything the walkthrough surfaces; commit fixes; summarize the before/after against the audit's A–K list.

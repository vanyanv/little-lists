# Performance Optimization — Design Spec

**Date:** 2026-07-11
**Status:** Approved design (pending spec review)
**Author:** pairing session (audit-driven)

## Goal

Make the app feel fast on iPhone Safari without changing how it looks or
behaves. Every change in this spec must be **visually identical** to today.
We measure before and after so the improvement is a real number.

## Why it's slow on iPhone (root cause)

Confirmed by a read-only audit (see below). It is **not** the network or the
database — it is main-thread JavaScript that a desktop CPU absorbs and an
iPhone (3–5× slower single-thread) cannot:

1. **A single monolithic store re-renders the whole tree on every mutation.**
   `lib/store.tsx` holds `lists`/`people`/`scraps`/`profile` in one context
   `useMemo`; `useList(id)`/`usePerson(id)` read `useStore().lists`. Any change
   replaces the value identity, so **every** `useStore()` consumer re-renders.
2. **The item editor writes to the store on every keystroke.** Typing a title
   calls `updateItem(..., { persist: false })` → `setLists` rebuilds the array
   → the open list page and every row re-render *per character*. There is **no
   `React.memo` anywhere** (0 matches), so nothing is spared.
3. **Heavy libraries load eagerly.** `canvas-confetti` is statically imported
   and mounted on every screen; `@dnd-kit` (4 packages) loads on every list
   page though it's used only in custom-sort mode; ~10 modal sheets are always
   mounted (closed) in `app-shell.tsx`, each pulling `bottom-sheet` motion into
   the initial bundle.
4. **A render-blocking cross-origin font `<link>`** (Noto Color Emoji, Google
   Fonts) stalls first paint on every page, with no `preconnect`.

## Scope decisions (locked with the user)

- **Store refactor: minimal / low-risk.** Keep the single-store architecture
  (no external-store migration). Fix re-renders via local editor state, a
  state/actions context split, and `React.memo`.
- **Motion: conservative — zero visual change.** Do **not** touch any
  animation, layout spring, mount stagger, `mix-blend-mode` grain, or
  `backdrop-blur`. These stay exactly as-is. (The nested per-row layout
  animations remain the single largest *raw* jank source; if the device still
  feels heavy after this work, revisiting them is the next lever — out of scope
  here.)
- **Virtualization: deferred.** No windowing dependency now.
- **Delivery: sliced subagent-driven development.**

## Guiding constraint

If a fix cannot preserve the exact look and behavior, it is out of scope. Emoji
must still render in color; drag, celebration, and every sheet must still work
identically.

---

## Slice 0 — Measurement harness + baseline

A repeatable script we run before Slice 1 and after every slice, so
"how much did we improve" is measured, not guessed.

**Two metric families:**

**A. Static bundle metrics (deterministic, from `next build`):**
- Total client JS, gzipped (baseline recorded: **477 KB @ `8f3572b`**).
- First-load JS for the list route specifically (the hot path).

**B. Runtime metrics under mobile emulation (Playwright + CDP):**
- Emulate an iPhone: 390×844 viewport, `Emulation.setCPUThrottlingRate: 6`
  (approximates a mid-tier iPhone vs the dev machine).
- **Editor typing latency** — the primary "feels laggy" interaction: open a
  list with ~30 seeded items, focus an item title, dispatch 30 characters, and
  record total scripting time and the longest single task (Long Tasks API /
  `performance.measure`). This is the metric Slice 2 must move most.
- **Hydration-to-interactive** — navigate to the list route and record time
  from `domcontentloaded` to first interaction-ready (throttled).
- **List commit count while typing** — a lightweight in-page counter (a
  `useEffect` render tick behind a `?perftest` flag, or a `MutationObserver`
  proxy) to show that per-keystroke re-renders drop from "whole tree" to "one
  field." Best-effort; the timing metrics are the source of truth.

**Deliverable:** `scripts/perf/measure.mjs` (or a Playwright spec under
`tests/perf/`) that prints a small JSON/table of the metrics above, plus a
committed `docs/superpowers/perf-baseline.md` capturing the baseline run. The
harness itself ships behind a dev-only path and is never imported by the app.

**Note on method:** CPU-throttled local emulation is a *proxy* for a real
iPhone, good for relative before/after deltas — not an absolute device number.
We report deltas ("typing scripting time −N%", "list route JS −N KB"), which is
what "how much we improved" means here.

---

## Slice 1 — Quick wins (bundling + fonts)

Low-risk, mechanical, each independently verifiable. No behavior change.

1. **Non-blocking emoji font.** `app/layout.tsx` — convert the render-blocking
   Noto Color Emoji `<link rel="stylesheet">` to a non-blocking load
   (`rel="preload" as="style"` + `onload` swap, or `media` swap) and add
   `<link rel="preconnect">` for `fonts.googleapis.com`/`fonts.gstatic.com`.
   Emoji still render identically; they just stop blocking first paint.
2. **Lazy-load `canvas-confetti`/`Celebration`.** Load via
   `next/dynamic(() => import(...), { ssr: false })` so the physics lib is
   fetched only when a celebration fires, not on every page.
3. **Lazy-load the drag engine.** Extract the `DndContext` + `@dnd-kit` branch
   of the list page into a component dynamically imported only when
   `sort === "custom"` (drag active). Non-custom list views stop paying for it.
4. **Lazy-mount modal sheets.** In `app-shell.tsx`, dynamic-import the ~10
   sheets so each loads on first open rather than sitting in the initial
   bundle. The open/close animation and behavior are unchanged.
5. **Drop the duplicate profile query.** `(main)/layout.tsx` calls
   `ensureProfileForClerkUser()` then `getInitialData()` which re-reads the
   profile; thread the already-fetched profile through to remove one round-trip
   per navigation.

**Gate:** `tsc + vitest + build`; confirm the list route's first-load JS drops
and total gzipped client JS drops vs baseline; Playwright smoke: page loads,
emoji are in color, drag still works in custom sort, a celebration still fires,
every sheet still opens.

---

## Slice 2 — Re-render elimination (the interaction win)

The changes that make typing and tapping feel immediate. Behavior identical.

1. **Local editor text state.** The item editor holds its in-progress title/
   note in local `useState` and no longer calls the store per keystroke; a
   single trailing write flushes on blur/debounce (persist path unchanged).
   Result: **zero store churn while typing** → no tree re-render per character.
2. **Split store context into state + stable actions.** Provide the action bag
   (all the `addItem`/`updateItem`/… callbacks — already stable via
   `useCallback`) through a separate context whose value identity never
   changes. Components that only dispatch subscribe to actions and stop
   re-rendering on unrelated data changes. Data-reading components still read
   from the state context. `useStore()` keeps working (composes both) for
   backward compatibility; new granular hooks (`useStoreActions()`,
   `useList`/`usePerson`) read the narrowest context they need.
3. **`React.memo` the row/card components.** `ItemCard`, `ListCard`,
   `PersonCard`, `StatusPill`, `ExpandableCard` — memoized, receiving item data
   via props so only the changed item re-renders. Ensure callbacks passed to
   them are stable (from the actions context), or the memo is defeated.

**Gate:** `tsc + vitest + build`; re-run the harness — editor typing scripting
time and longest-task should drop sharply vs baseline, and the typing commit
count should collapse from tree-wide to per-field; Playwright smoke: editing,
status changes, pin, move/copy, reorder, add-item all behave identically with a
clean console.

---

## Final step — before/after report

Re-run the Slice 0 harness on the finished branch and write the comparison into
`docs/superpowers/perf-baseline.md`: baseline vs final for each metric, as
absolute values and percentage deltas. This is the "how much we improved"
answer.

## Testing strategy (all slices)

- Unit: `vitest` for any changed pure logic (store split, editor flush).
- Build: `npm run build` is the only gate that catches RSC-boundary breaks from
  the dynamic-import changes — always run it.
- Live: Playwright on an iPhone-sized viewport, dev mode (Clerk test signup
  `+clerk_test@example.com`, code `424242`), asserting identical behavior and a
  clean console per the `verify` skill.
- Pre-existing ~7 lint errors are not regressions — do not chase them.

## Out of scope (explicit)

Animation/layout/stagger changes, virtualization, `mix-blend-mode` grain,
`backdrop-blur` tuning, external-store migration, image work (already correct).

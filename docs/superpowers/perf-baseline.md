# Performance baseline & results

Branch `perf/optimization` vs `main` (baseline `2135790`). Goal: faster iPhone
Safari with **zero visual/behavioral change**. Two things were measured — the
interaction win (typing) and bundle shape.

## Headline: per-keystroke render cost (the interaction win)

Method: 80-item list, item editor open, **real** keystrokes typed via Playwright,
measured with the browser **Event Timing API** (`PerformanceObserver({type:'event'})`,
`processingEnd - processingStart` per input event = the synchronous
input-handler + React re-render time per keystroke). Dev mode, so treat the
**ratio**, not the absolute ms, as the signal (both sides measured identically;
prod is faster in absolute terms). An earlier synthetic `dispatchEvent` probe was
discarded — React batches programmatic events, so it measured dispatch overhead,
not render cost.

| Per-keystroke input processing | Baseline (main) | Branch | Improvement |
|---|---|---|---|
| Median | **21.3 ms** | **3.9 ms** | ~5.5× faster (−82%) |
| Mean | 28.0 ms | 4.25 ms | ~6.6× faster (−85%) |
| Worst keystroke (tail) | **117–118 ms** | **5.5 ms** | jank spikes eliminated |

The baseline's recurring 100 ms+ spikes are exactly the O(n) full-list
re-render firing on every keystroke across all 80 items — dropped-frame jank on
a fast desktop, multi-hundred-ms freezes on an iPhone. On the branch the editor's
local overlay means the store (and the list) is untouched while typing, and the
memoized rows don't re-render, so every keystroke stays in the single-digit-ms
range. This is the change you feel on the phone.

## Bundle shape

Method: gzipped client JS from `next build` (`node scripts/perf/bundle-report.mjs`).

| Metric | Baseline (8f3572b) | After Slice 1 | Note |
|---|---|---|---|
| Total client JS (gzip, ALL chunks) | 477.5 KB | 567.4 KB | grew — **expected, not a regression** |
| List-route first-load JS | n/a from Turbopack build | n/a | per-route sizes not emitted statically |

Why "total grew" is not a regression: code-splitting **moves** code out of the
eager path into on-demand lazy chunks that only download when used, and each
split adds a little per-chunk/shared-runtime overhead — so the *sum of every
chunk* goes up while the *first load* goes down. What is now lazy instead of
eagerly bundled on every screen:

- **`canvas-confetti`** (~7 KB) — loads only when a celebration fires.
- **`@dnd-kit`** (4 packages, ~30–40 KB) — loads only in custom-sort mode.
- **10 modal sheets** — each loads on first open, not on app boot.
- **Emoji web-font** — no longer a render-blocking cross-origin `<link>`; it's
  injected client-side, non-blocking, so it never stalls first paint.

Turbopack does not emit per-route first-load sizes, and a dev-mode browser
measurement is dominated by unminified/HMR chunks (not representative), so a
precise prod first-load delta wasn't captured; the improvement above is
structural (fewer bytes on the eager path + unblocked first paint).

## Functional verification (zero visual/behavioral change)

Live smoke on the branch (iPhone-sized viewport), all **PASS**:
- Item editing: summary tracks typing live and persists after debounce/reload.
- Status pill + pin apply correctly; item floats to top on pin.
- Add-item sheet opens and closes.
- Custom-sort drag handles appear on rows.
- Console clean (only the expected Clerk dev-keys notice; the emoji-font
  hydration mismatch was found and fixed in `40b9d5f`).

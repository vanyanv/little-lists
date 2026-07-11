# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app feel fast on iPhone Safari with **zero visual or behavioral change** — by eliminating per-keystroke tree re-renders, code-splitting eager libraries, and unblocking first paint. Measured before/after.

**Architecture:** Keep the single-store architecture. Split its context into a **state** context and a never-changing **actions** context so action-only components stop re-rendering; move the item editor's live text into a **local overlay** in `ItemCard` so typing never touches the store; `React.memo` the row/card components. Code-split `canvas-confetti`, `@dnd-kit`, and the modal sheets via `next/dynamic`. Make the emoji font load non-blocking.

**Tech Stack:** Next 16 (App Router, Turbopack), React 19, `motion` v12 (untouched), `@dnd-kit`, Vitest 4, Playwright MCP.

## Global Constraints

- **Zero visual change.** No animation, layout, `mix-blend-mode`, `backdrop-blur`, spacing, color, or copy may change. Emoji must still render in color; drag, celebration, and every sheet must behave identically.
- **No new runtime dependencies.** Use `next/dynamic`, React built-ins. (Measurement tooling may use the already-installed `playwright`.)
- **Keep the single store.** No external-store (Zustand/`useSyncExternalStore`) migration. `useStore()` must keep working for every existing caller.
- **Gate every task:** `npx tsc --noEmit && npx vitest run && npm run build`. `npm run build` is the only gate that catches RSC-boundary breaks from `next/dynamic` — always run it.
- **Prisma migrations** are not needed (no schema change). Do not run `prisma migrate`.
- Repo has ~7 pre-existing lint errors (setState-in-effect, unescaped entities) — do not chase them.
- Motion/animation code is out of scope. If a fix would require touching an animation, stop and flag it.

---

## Slice 0 — Measurement harness + baseline

### Task 1: Bundle-size reporter + runtime typing probe + baseline capture

**Files:**
- Create: `scripts/perf/bundle-report.mjs`
- Create: `docs/superpowers/perf-baseline.md`
- Create: `tests/perf/README.md` (the runtime-probe recipe the controller runs)

**Interfaces:**
- Produces: `node scripts/perf/bundle-report.mjs` prints a table and a machine-readable JSON line (`PERF_JSON {…}`) with `totalGzipKB` and `chunkCount`. Later tasks/the final report diff against the numbers this records.

- [ ] **Step 1: Write the bundle reporter**

Create `scripts/perf/bundle-report.mjs`:

```js
// Sums gzipped client JS in .next/static/chunks — the deterministic size metric.
// Run AFTER `npm run build`. Prints a human table + a PERF_JSON line to diff.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIR = ".next/static/chunks";
let files;
try {
  files = readdirSync(DIR).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`No build found at ${DIR}. Run \`npm run build\` first.`);
  process.exit(1);
}

const rows = files
  .map((f) => {
    const buf = readFileSync(join(DIR, f));
    return { f, raw: statSync(join(DIR, f)).size, gz: gzipSync(buf).length };
  })
  .sort((a, b) => b.gz - a.gz);

const totalRaw = rows.reduce((n, r) => n + r.raw, 0);
const totalGz = rows.reduce((n, r) => n + r.gz, 0);
const kb = (n) => (n / 1024).toFixed(1).padStart(8);

console.log("gzip(KB)   raw(KB)   chunk");
for (const r of rows.slice(0, 12)) console.log(`${kb(r.gz)} ${kb(r.raw)}   ${r.f}`);
console.log("--------");
console.log(`${kb(totalGz)} ${kb(totalRaw)}   TOTAL (${rows.length} chunks)`);
console.log(
  `PERF_JSON ${JSON.stringify({ totalGzipKB: +(totalGz / 1024).toFixed(1), totalRawKB: +(totalRaw / 1024).toFixed(1), chunkCount: rows.length })}`
);
```

- [ ] **Step 2: Run it against the current build**

Run: `npm run build && node scripts/perf/bundle-report.mjs`
Expected: a table and a `PERF_JSON {"totalGzipKB":477,...}` line (± a few KB).

- [ ] **Step 3: Write the runtime-probe recipe**

Create `tests/perf/README.md` documenting the interaction the controller runs via Playwright MCP to measure typing cost (no app instrumentation — exaggerate list size so the O(N) re-render cost is visible without CPU throttling):

```markdown
# Runtime typing probe (run via Playwright MCP)

Goal: measure main-thread time to process a burst of keystrokes in the item
editor, on a deliberately large list so the per-keystroke re-render cost is
visible on desktop. Compare baseline vs post-Slice-2.

1. Sign in (dev): sign up `perf+clerk_test@example.com`, code `424242`.
2. Create a list, then seed ~80 items. Fastest path: in the browser console,
   loop `window`-exposed store isn't available — instead add via SQL:
   `INSERT INTO "ListItem" (…) select …` OR click-add ~80 (slow). Prefer SQL
   against the dev list id (see verify skill for the Neon connection).
3. Open the list, expand one item's editor.
4. In the page, run this probe via browser_evaluate and record `ms`:
   ```js
   () => {
     const input = document.querySelector('input[id^="item-title-"]');
     input.focus();
     const t0 = performance.now();
     for (let i = 0; i < 25; i++) {
       input.value += "x";
       input.dispatchEvent(new Event("input", { bubbles: true }));
     }
     // force React to flush by reading layout, then measure
     void input.offsetHeight;
     return { ms: +(performance.now() - t0).toFixed(1) };
   }
   ```
5. Record the number in perf-baseline.md. Post-Slice-2 it should drop sharply
   (baseline re-renders all ~80 cards per keystroke; after, only the edited
   card's local state updates).
```

- [ ] **Step 4: Capture the baseline doc**

Create `docs/superpowers/perf-baseline.md` with the bundle numbers from Step 2 and a placeholder table for the runtime probe (filled during execution):

```markdown
# Performance baseline & results

Method: gzipped client JS from `next build`; runtime typing probe per
`tests/perf/README.md` (proxy for iPhone via exaggerated list size, desktop).

| Metric | Baseline (8f3572b) | After Slice 1 | After Slice 2 | Delta |
|---|---|---|---|---|
| Total client JS (gzip) | 477 KB | — | — | — |
| List-route first-load JS (gzip) | TBD | — | — | — |
| Typing burst, 25 keys / 80-item list (ms) | TBD | — | — | — |

(List-route first-load and the typing baseline are captured during execution
before Slice 1 lands.)
```

- [ ] **Step 5: Commit**

```bash
git add scripts/perf/bundle-report.mjs docs/superpowers/perf-baseline.md tests/perf/README.md
git commit -m "perf(measure): bundle-size reporter, runtime typing probe, baseline doc"
```

---

## Slice 1 — Quick wins (bundling + fonts)

### Task 2: Non-blocking emoji font

**Files:**
- Modify: `app/layout.tsx:75-81`

- [ ] **Step 1: Replace the render-blocking `<link>`**

In `app/layout.tsx`, replace the `<head>` block:

```tsx
        <head>
          {/* color-emoji fallback for platforms without a native emoji font */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
          />
        </head>
```

with a `preconnect` + non-blocking load. This is a React **Server** Component,
so we can't use a string `onLoad` handler (React won't emit it). Use the
RSC-safe pattern: load the stylesheet as `media="print"` (fetched but never
render-blocking), preload it for an early fetch, then flip `media` to `all` with
a tiny inline script. Emoji render identically; they just stop blocking paint:

```tsx
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          {/* color-emoji fallback for platforms without a native emoji font.
              Non-blocking: fetched as media=print, then flipped to all so it
              never stalls first paint. iOS/Android already have native color
              emoji, so the network cost is pure fallback insurance. */}
          <link
            rel="preload"
            as="style"
            href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
          />
          <link
            id="emoji-font"
            rel="stylesheet"
            media="print"
            href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: "var l=document.getElementById('emoji-font');if(l)l.media='all';",
            }}
          />
          <noscript>
            {/* no-JS fallback: apply the stylesheet normally */}
            <link
              rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
            />
          </noscript>
        </head>
```

The inline `<script>` runs the instant the `<link>` parses (it sits right after
it), flipping `media` to `all` so the already-fetched sheet applies without ever
having blocked paint. `dangerouslySetInnerHTML` is the correct RSC-safe way to
emit an inline script.

- [ ] **Step 2: Gate**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS. (No unit test — visual/HTML change verified in smoke.)

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "perf(fonts): load Noto Color Emoji non-blocking + preconnect"
```

### Task 3: Lazy-load the celebration/confetti

**Files:**
- Modify: `components/app-shell.tsx:20,66`

**Interfaces:**
- Consumes: `Celebration` from `./celebration` (unchanged export, `{ signal }` prop).

- [ ] **Step 1: Swap the static import for a dynamic one**

In `components/app-shell.tsx`, remove `import { Celebration } from "./celebration";` (line 20) and add near the top (after the other imports):

```tsx
import dynamic from "next/dynamic";

// Confetti physics (canvas-confetti) is only needed for the rare milestone
// celebration — load it lazily so it stays out of the initial bundle.
const Celebration = dynamic(
  () => import("./celebration").then((m) => m.Celebration),
  { ssr: false }
);
```

Leave `<Celebration signal={celebration} />` (line 66) exactly as-is.

- [ ] **Step 2: Gate**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS. Confirm `canvas-confetti` is no longer in the initial app chunk (it splits into its own lazy chunk).

- [ ] **Step 3: Commit**

```bash
git add components/app-shell.tsx
git commit -m "perf(bundle): lazy-load celebration/canvas-confetti"
```

### Task 4: Lazy-load the drag engine (@dnd-kit)

**Files:**
- Create: `components/list-dnd.tsx`
- Modify: `app/app/(main)/list/[id]/page.tsx` (extract the `dragEnabled` branch + all `@dnd-kit` imports + `SortableItemRow` + `sensors`/`onDragEnd`)

**Interfaces:**
- Produces: `ListDnd` — a client component that renders the sortable grid. Props: `{ list: List; items: Item[]; view: ViewMode; layoutClass: string; onReorder: (orderedIds: string[]) => void }`.
- Consumes: `sortItems` order is already applied by the caller (`items` = `visible`).

- [ ] **Step 1: Create `components/list-dnd.tsx`**

Move ALL `@dnd-kit` imports (page lines 25-43), the `sensors` construction (148-151), `onDragEnd` logic (153-161), and the `SortableItemRow` component (431-476) into this new client component. It owns the DnD machinery so the list page no longer imports `@dnd-kit` at all:

```tsx
"use client";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { Item, List } from "@/lib/types";
import { statusesForList } from "@/lib/types";
import { ItemCard } from "@/components/item-card";
import { focusRing } from "@/lib/a11y";
import type { ViewMode } from "@/components/view-toggle";

export function ListDnd({
  list,
  items,
  view,
  layoutClass,
  onReorder,
}: {
  list: List;
  items: Item[];
  view: ViewMode;
  layoutClass: string;
  onReorder: (orderedIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={view === "grid" ? [restrictToParentElement] : [restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={layoutClass}>
          {items.map((item) => (
            <SortableItemRow key={item.id} list={list} item={item} view={view} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItemRow({ list, item, view }: { list: List; item: Item; view: ViewMode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1.5">
      {item.pinned ? (
        <span aria-hidden className="mt-1 w-6 shrink-0" />
      ) : (
        <button
          type="button"
          aria-label={`Reorder ${item.title}`}
          {...attributes}
          {...listeners}
          className={`mt-1 grid h-9 w-6 shrink-0 touch-none cursor-grab place-items-center rounded-md text-brown-soft/70 transition-colors hover:bg-cream-deep hover:text-ink active:cursor-grabbing ${focusRing}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <ItemCard listId={list.id} item={item} view={view} statuses={statusesForList(list)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the page via `next/dynamic`**

In `app/app/(main)/list/[id]/page.tsx`: delete the `@dnd-kit` imports (25-43), the `sensors` (148-151), `onDragEnd` (153-161), and the `SortableItemRow` function (431-476). Add at top:

```tsx
import dynamic from "next/dynamic";

// The drag engine (@dnd-kit, ~4 packages) is only used in custom-sort mode;
// load it lazily so ordinary list views don't pay for it.
const ListDnd = dynamic(() => import("@/components/list-dnd").then((m) => m.ListDnd), { ssr: false });
```

Replace the `dragEnabled ? (<DndContext>…</DndContext>)` JSX branch (386-400) with:

```tsx
        ) : dragEnabled ? (
          <ListDnd
            list={list}
            items={visible}
            view={view}
            layoutClass={layoutClass}
            onReorder={(orderedIds) => reorderItems(list.id, orderedIds)}
          />
        ) : (
```

`reorderItems` is already destructured from `useStore()` (page line 59). `arrayMove` is no longer used in the page — remove it from imports if referenced only there (it was only in `onDragEnd`, now moved).

- [ ] **Step 3: Gate**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: PASS. `@dnd-kit` should now be a lazy chunk, not in the list route's first load.

- [ ] **Step 4: Commit**

```bash
git add components/list-dnd.tsx "app/app/(main)/list/[id]/page.tsx"
git commit -m "perf(bundle): code-split @dnd-kit into a lazy custom-sort component"
```

### Task 5: Lazy-mount the modal sheets

**Files:**
- Modify: `components/app-shell.tsx` (imports for the 10 sheets + their mount points)

**Interfaces:**
- Each sheet reads its own open/closed state from `useUi()` and renders `null` when closed, so wrapping them in `next/dynamic` defers loading until first open with no behavior change.

- [ ] **Step 1: Convert the sheet imports to dynamic**

In `components/app-shell.tsx`, replace these static imports:

```tsx
import { AddItemModal } from "./add-item-modal";
import { PocketSheet } from "./pocket-sheet";
import { AddDetailSheet } from "./add-detail-sheet";
import { CreateListSheet } from "./create-list-sheet";
import { CreatePersonSheet } from "./create-person-sheet";
import { EditListSheet } from "./edit-list-sheet";
import { EditPersonSheet } from "./edit-person-sheet";
import { EditDetailSheet } from "./edit-detail-sheet";
import { ConfirmSheet } from "./confirm-sheet";
import { MoveItemSheet } from "./move-item-sheet";
```

with dynamic imports (keep `ssr: false` — these are client-only overlays):

```tsx
const AddItemModal = dynamic(() => import("./add-item-modal").then((m) => m.AddItemModal), { ssr: false });
const PocketSheet = dynamic(() => import("./pocket-sheet").then((m) => m.PocketSheet), { ssr: false });
const AddDetailSheet = dynamic(() => import("./add-detail-sheet").then((m) => m.AddDetailSheet), { ssr: false });
const CreateListSheet = dynamic(() => import("./create-list-sheet").then((m) => m.CreateListSheet), { ssr: false });
const CreatePersonSheet = dynamic(() => import("./create-person-sheet").then((m) => m.CreatePersonSheet), { ssr: false });
const EditListSheet = dynamic(() => import("./edit-list-sheet").then((m) => m.EditListSheet), { ssr: false });
const EditPersonSheet = dynamic(() => import("./edit-person-sheet").then((m) => m.EditPersonSheet), { ssr: false });
const EditDetailSheet = dynamic(() => import("./edit-detail-sheet").then((m) => m.EditDetailSheet), { ssr: false });
const ConfirmSheet = dynamic(() => import("./confirm-sheet").then((m) => m.ConfirmSheet), { ssr: false });
const MoveItemSheet = dynamic(() => import("./move-item-sheet").then((m) => m.MoveItemSheet), { ssr: false });
```

(`dynamic` is already imported from Task 3.) Leave the JSX mount points (56-65) unchanged. Verify each sheet's real export name against its file — adjust `.then((m) => m.X)` if any uses a different named export.

- [ ] **Step 2: Gate**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: PASS. Each sheet becomes its own lazy chunk; the initial app bundle shrinks.

- [ ] **Step 3: Commit**

```bash
git add components/app-shell.tsx
git commit -m "perf(bundle): lazy-mount modal sheets on first open"
```

### Task 6: Drop the duplicate profile query

**Files:**
- Modify: `app/app/(main)/layout.tsx`
- Read first: `lib/server/data.ts`, `lib/server/profile.ts` (to confirm signatures)

**Interfaces:**
- `ensureProfileForClerkUser()` already returns the profile row; `getInitialData()` re-reads it. Thread the row through instead.

- [ ] **Step 1: Confirm the shapes**

Read `lib/server/data.ts` (`getInitialData`) and `lib/server/profile.ts` (`ensureProfileForClerkUser`). Determine whether `getInitialData` can accept an already-loaded profile (or whether it independently needs the userId). If `getInitialData` reads the profile via a separate query, add an optional parameter `getInitialData(opts?: { profile?: ProfileRow })` that skips the profile re-read when provided, mapping the passed row exactly as before.

- [ ] **Step 2: Pass the row through**

In `layout.tsx`, capture the full `profileRow` from `ensureProfileForClerkUser()` (already done, line 32) and pass it to `getInitialData({ profile: profileRow })` (line 49). The serialized `data.profile` must be byte-identical to today.

If threading it cleanly is more than a small change (e.g., `getInitialData` fans out to unrelated queries), STOP and report — this is a minor optimization and not worth a risky refactor. A DONE_WITH_CONCERNS noting "left as-is, not worth the churn" is an acceptable outcome for this task.

- [ ] **Step 3: Gate**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/app/(main)/layout.tsx" lib/server/data.ts
git commit -m "perf(data): drop duplicate profile query on app navigation"
```

---

## Slice 2 — Re-render elimination

### Task 7: Split the store into state + stable actions

**Files:**
- Modify: `lib/store.tsx`

**Interfaces:**
- Produces: `useStore()` unchanged (composes both contexts) — every existing caller keeps working. New `useStoreActions()` returns only the action bag (stable identity). `useList`/`usePerson` unchanged in signature.
- The actions context value identity must NOT change across data mutations.

- [ ] **Step 1: Introduce two contexts**

In `lib/store.tsx`, replace the single `StoreContext` with a **state** context (the data fields) and an **actions** context (all callbacks). The actions object is memoized on the callbacks only (which are already stable via `useCallback`), so its identity never changes after mount:

```tsx
type StoreState = Pick<StoreValue, "lists" | "people" | "scraps" | "profile" | "celebration" | "saveError">;
type StoreActions = Omit<StoreValue, keyof StoreState>;

const StoreStateContext = createContext<StoreState | null>(null);
const StoreActionsContext = createContext<StoreActions | null>(null);
```

Build `actions` with `useMemo` over ONLY the callback deps (no `lists`/`people`/etc.), and `state` with `useMemo` over the data fields:

```tsx
  const actions = useMemo<StoreActions>(
    () => ({
      addList, addItem, updateItem, deleteItem, setItemPinned, moveItem, copyItem,
      setListView, setListSort, reorderItems, addScrap, deleteScrap, setScrapDetection,
      fileScrap, updateList, setListPinned, deleteList, duplicateList, addPerson,
      addPersonDetail, deletePersonDetail, updatePerson, deletePerson, updatePersonDetail,
      setProfileTheme, dismissChecklist, clearExamples, fireCelebration,
    }),
    [ /* the same callback identifiers — all useCallback-stable */
      addList, addItem, updateItem, deleteItem, setItemPinned, moveItem, copyItem,
      setListView, setListSort, reorderItems, addScrap, deleteScrap, setScrapDetection,
      fileScrap, updateList, setListPinned, deleteList, duplicateList, addPerson,
      addPersonDetail, deletePersonDetail, updatePerson, deletePerson, updatePersonDetail,
      setProfileTheme, dismissChecklist, clearExamples, fireCelebration,
    ]
  );
  const state = useMemo<StoreState>(
    () => ({ lists, people, scraps, profile, celebration, saveError }),
    [lists, people, scraps, profile, celebration, saveError]
  );

  return (
    <StoreActionsContext.Provider value={actions}>
      <StoreStateContext.Provider value={state}>{children}</StoreStateContext.Provider>
    </StoreActionsContext.Provider>
  );
```

Note: `duplicateList` closes over `lists` today (dep array includes `lists`), which would make `actions` identity change on every list mutation and defeat the split. Fix `duplicateList` to read lists from a ref instead: add `const listsRef = useRef(lists); listsRef.current = lists;` and have `duplicateList` read `listsRef.current.find(...)`, with `[signalSaveError]` as its only dep. Verify no other action closes over `lists`/`people`/`scraps`/`profile` in a way that adds them to its dep array; if one does, apply the same ref pattern.

- [ ] **Step 2: Rebuild the hooks**

```tsx
export function useStore(): StoreValue {
  const state = useContext(StoreStateContext);
  const actions = useContext(StoreActionsContext);
  if (!state || !actions) throw new Error("useStore must be used within ListsProvider");
  return { ...state, ...actions };
}

export function useStoreActions(): StoreActions {
  const actions = useContext(StoreActionsContext);
  if (!actions) throw new Error("useStoreActions must be used within ListsProvider");
  return actions;
}

export function useStoreState(): StoreState {
  const state = useContext(StoreStateContext);
  if (!state) throw new Error("useStoreState must be used within ListsProvider");
  return state;
}

export function useList(id: string): List | undefined {
  return useStoreState().lists.find((l) => l.id === id);
}
export function usePerson(id: string): Person | undefined {
  return useStoreState().people.find((p) => p.id === id);
}
```

`useStore()` still returns the full merged value (a fresh object each call, but that's how consumers already use it via destructuring — no identity dependence). Existing callers are unchanged.

- [ ] **Step 3: Point pure action consumers at `useStoreActions()`**

Update components that only dispatch (don't read data) to call `useStoreActions()` so they stop re-rendering on data changes. At minimum: `app-shell.tsx` should read `celebration` via `useStoreState()` (it only needs that one field). Do NOT convert data-reading components in this task — that's Task 8/9. Grep `useStore()` callers and convert only the clearly action-only ones; leave the rest on `useStore()`.

- [ ] **Step 4: Add a test**

Create/extend `lib/store.test.tsx` (or add to an existing store test) — a React Testing Library test that renders a `ListsProvider`, captures the `useStoreActions()` value, triggers a data mutation (e.g. `addItem`), and asserts the actions object identity is unchanged (`Object.is(before, after)`), while `useStoreState().lists` did change. If RTL isn't set up, assert the invariant with a focused unit test around the memo deps instead. Run: `npx vitest run lib/store`.

- [ ] **Step 5: Gate + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add lib/store.tsx lib/store.test.tsx
git commit -m "perf(store): split state/actions contexts so action-only consumers skip data re-renders"
```

### Task 8: Local live-overlay in the item editor (kill per-keystroke store writes)

**Files:**
- Modify: `components/item-card.tsx`

**Interfaces:**
- Consumes: `useStoreActions()` (from Task 7) for `updateItem` etc.
- Behavior contract: typing updates the summary AND editor live (identical to today), but the store is written only on the debounced trailing flush / blur — no store write per keystroke.

- [ ] **Step 1: Lift live text into `ItemCard` and derive a display item**

Today `ItemEditor` calls `queueEdit` → `updateItem(persist:false)` on every keystroke so the summary (rendered by `ItemCard`) tracks live. Move the in-progress text up so the summary reads local state instead of the store:

- In `ItemCard`, add local overlay state for the editable text fields:
  ```tsx
  const [overlay, setOverlay] = useState<Partial<Pick<Item, "title" | "note" | "tags">>>({});
  const displayItem = useMemo(() => ({ ...item, ...overlay }), [item, overlay]);
  ```
  Reset the overlay when the underlying item's persisted values change (server swap):
  ```tsx
  useEffect(() => { setOverlay({}); }, [item.title, item.note, item.tags]);
  ```
- Render every summary (`PosterCard`/`GridTile`/`NoteCard`/`CompactRow`) from `displayItem` instead of `item`.
- Pass `displayItem` and an `onLiveEdit(patch)` callback into `ItemEditor`.

- [ ] **Step 2: Rework `ItemEditor` to write the store only on flush**

- `ItemEditor` keeps its own `useState` for the input values (as today) for caret stability, and calls `onLiveEdit(patch)` on each keystroke to update the parent overlay (drives the live summary) — this is local React state only, no store touch.
- Change `queueEdit` so it no longer calls `updateItem(..., { persist: false })`. It only accumulates `pendingRef` and (re)arms the 600ms timer. `flush` calls `updateItem(listId, item.id, pendingRef.current)` (persist path unchanged) and then clears the overlay for those keys (the store now holds them). Keep the `onBlur={flush}` and unmount-flush behavior.
- Discrete controls (status, rating, emoji, pin, person link) keep calling `updateItem` immediately as today — they are single taps, not per-keystroke, and already persist.

Net: while typing, only `ItemCard`'s subtree re-renders (local state); the store — and therefore the whole list — is untouched until the debounce fires. The summary still updates live because it reads `displayItem`.

- [ ] **Step 3: Verify no visual/behavior drift**

The summary text must update on each keystroke exactly as before; the trailing write must still persist after 600ms idle or on blur; closing the editor must flush. Confirm the person-link path (`onPersonChange`) still flushes before persisting the link (it calls `flush()` first — keep that).

- [ ] **Step 4: Gate + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add components/item-card.tsx
git commit -m "perf(editor): local live-overlay so typing never re-renders the list"
```

### Task 9: Memoize the row/card components

**Files:**
- Modify: `components/item-card.tsx`, `components/list-card.tsx`, `components/person-card.tsx`, `components/status-pill.tsx`, `components/expandable-card.tsx`

**Interfaces:**
- Each component wrapped in `React.memo`. Callbacks passed in as props must be stable (from `useStoreActions()` or `useCallback`) or memo is defeated — verify at each call site.

- [ ] **Step 1: Wrap each in `React.memo`**

For each component, export a memoized version. Example for `ItemCard`:
```tsx
export const ItemCard = memo(function ItemCard({ … }: ItemCardProps) { … });
```
(Extract the props into a named type if inline.) Do the same for `ListCard`, `PersonCard`, `StatusPill`, `ExpandableCard`. Import `memo` from `react`.

- [ ] **Step 2: Ensure props are stable at call sites**

- List page maps `visible` → `ItemCard` with `statuses={statusesForList(list)}` inline — `statusesForList` returns a new array each render, defeating memo. Hoist it: compute `const statuses = useMemo(() => statusesForList(list), [list])` once in the page (and in `ListDnd`) and pass that reference. Do the same wherever `ItemCard` is rendered (`person/[id]/page.tsx`).
- Confirm `ListCard`/`PersonCard` receive only primitive/stable props (ids, the item object, stable callbacks). Where they call `useStore()` for actions, switch to `useStoreActions()`.

- [ ] **Step 3: Gate + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add components/item-card.tsx components/list-card.tsx components/person-card.tsx components/status-pill.tsx components/expandable-card.tsx "app/app/(main)/list/[id]/page.tsx" "app/app/(main)/person/[id]/page.tsx" components/list-dnd.tsx
git commit -m "perf(render): memoize row/card components + stabilize their props"
```

---

## Final step — Task 10: Re-measure & write the report

**Files:**
- Modify: `docs/superpowers/perf-baseline.md`

- [ ] **Step 1: Rebuild and re-run the bundle reporter**

Run: `npm run build && node scripts/perf/bundle-report.mjs`
Record `totalGzipKB` and, from the build output, the list-route first-load JS.

- [ ] **Step 2: Re-run the runtime typing probe**

Follow `tests/perf/README.md` on the finished branch (same 80-item list). Record `ms`.

- [ ] **Step 3: Fill the results table** in `docs/superpowers/perf-baseline.md` with baseline vs after-Slice-1 vs after-Slice-2, absolute values and % deltas.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/perf-baseline.md
git commit -m "perf(measure): before/after results"
```

---

## Self-review checklist (controller, before dispatching Task 1)

- Every task ends with an independently testable deliverable and a commit. ✓
- No task changes animation/layout/blur/grain/copy (global constraint). ✓
- `useStore()` stays working for all callers (Task 7 composes both contexts). ✓
- Task 8's live-overlay preserves live summary updates → zero visual change. ✓
- Task 9 memo is guarded by prop-stability fixes (statuses hoist, actions hook). ✓

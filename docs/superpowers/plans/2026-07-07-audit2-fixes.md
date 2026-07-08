# Design Audit 2 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all production/beta findings from the 2026-07-07 design audit: the trust layer (false-empty on DB failure, silent mutation failures, undo/rollback symmetry for deletes), the 320-430px layout bugs, chrome polish, a profile partial redesign, and voice/keyboard completion.

**Architecture:** All state lives in the optimistic client store (`lib/store.tsx`, React context over server actions in `lib/actions.ts`). Failure surfacing uses a signal-state pattern (like the existing `celebration` signal) because `UiProvider` (toasts) mounts *inside* `AppShell`, which is *inside* `ListsProvider` — the store cannot call `useUi`. Undo for deletes uses deferred server deletes: remove locally, return an `{undo, commit}` handle, and only fire the server action when the undo toast expires.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, motion/react, Clerk, Prisma/Neon, vitest.

## Global Constraints

- **Voice:** all user-facing copy is warm Little Lists voice ("little world/little thing"); NO em dashes in UI strings; no robotic labels (Submit/Manage/No data/Error).
- **Tokens only:** colors via the OKLCH tokens/theme vars in `app/globals.css`; no `#000`/`#fff`, no side-stripe borders, no gradient text.
- **Motion:** any new motion must use `lib/motion.ts` springs/eases and be reduced-motion safe (`useReducedMotion` or `MotionConfig` already wraps the app).
- **Inputs:** every text input/textarea/select must have font-size ≥ 1rem (16px) so iOS Safari never zooms on focus.
- **Lint baseline:** `npm run lint` has 4 pre-existing errors + 1 warning (setState-in-effect in add-item-modal/overflow-menu, unescaped entities). Do not chase them; do not add new ones.
- **Tests:** `npm test` (vitest) must stay green. TDD applies where a pure seam exists (`lib/`); UI/layout tasks verify via the running app instead.
- **Verification environment:** a dev server is already running at `http://localhost:3000`, signed in as `audit-20260707+clerk_test@example.com` (password `CozyAudit!2026pass`) with 4 lists and a person "Priya". If the server is down: `npm run dev`. Clerk is in dev mode: any `x+clerk_test@example.com` signup works with code `424242`. Playwright MCP can only save screenshots inside the repo; use relative paths then delete them before committing.
- **Branch:** all work happens on branch `design-audit-2-fixes` off `main`. Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: DB outage must render the error page, not a false-empty home

A failed `getInitialData()` currently seeds `{lists: [], people: []}`, so a user with data sees "No little worlds yet". Let it throw to the branded boundary at `app/app/error.tsx` ("Your little worlds are safe... Try again").

**Files:**
- Modify: `app/app/(main)/layout.tsx:50-60`

**Interfaces:**
- Consumes: `getInitialData()` from `@/lib/server/data` (unchanged), `app/app/error.tsx` (already exists, unchanged).
- Produces: nothing new; later tasks assume load failures no longer produce empty seeds.

- [ ] **Step 1: Create the branch**

```bash
cd /home/vardan/little-lists && git checkout -b design-audit-2-fixes main
```

- [ ] **Step 2: Replace the swallowing try/catch**

In `app/app/(main)/layout.tsx`, replace lines 50-60:

```tsx
  let seed: StoreSeed = { lists: [], people: [], profile: FALLBACK_PROFILE };
  try {
    const data = await getInitialData();
    seed = {
      lists: data.lists,
      people: data.people,
      profile: data.profile ?? FALLBACK_PROFILE,
    };
  } catch (err) {
    console.error("getInitialData failed; seeding an empty little world", err);
  }
```

with:

```tsx
  // A failed load must NOT render as an empty little world: a user with real
  // data would see a false fresh-start, the most trust-breaking screen this
  // app can show. Throwing reaches app/app/error.tsx, which promises their
  // little worlds are safe and offers a retry.
  const data = await getInitialData();
  const seed: StoreSeed = {
    lists: data.lists,
    people: data.people,
    profile: data.profile ?? FALLBACK_PROFILE,
  };
```

Also update the `FALLBACK_PROFILE` comment (lines 13-15) from "Shown only if the DB is briefly unreachable and a resolved profile is missing a field" to:

```tsx
// Shown only if a resolved user has no profile row yet mid-request; neutral so
// it never leaks a real-looking identity. A reload picks up the real profile.
```

- [ ] **Step 3: Verify the failure path renders the branded error**

Temporarily add `throw new Error("simulated outage");` as the first line of the `getInitialData` function body in `lib/server/data.ts`. Load `http://localhost:3000/app` (Playwright or curl). Expected: the "Something got a little tangled" screen with "Try again", NOT "No little worlds yet". Remove the throw line, reload, confirm home renders with the 4 lists.

- [ ] **Step 4: Typecheck and commit**

```bash
npx tsc --noEmit && git add app/app/\(main\)/layout.tsx && git commit -m "fix(trust): render error page on data-load failure instead of false-empty home

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Surface silent mutation failures with rollback + a warm toast

Nine mutators in `lib/store.tsx` are `void action().catch(console.error)`: a failed status change, list edit, or theme change shows success and silently reverts on next load. Give each: (a) rollback to the pre-mutation snapshot, (b) a `saveError` signal consumed by a new bridge component that shows "That didn't save. Let's try again 🌿". (Deletes are handled in Task 3; do NOT touch `deleteList`/`deletePerson`/`deletePersonDetail` here.)

**Files:**
- Modify: `lib/store.tsx`
- Create: `components/save-error-toast.tsx`
- Modify: `components/app-shell.tsx`

**Interfaces:**
- Consumes: existing actions from `lib/actions.ts`; `useUi().showToast(message)` from `lib/ui.tsx`.
- Produces: `StoreValue.saveError: SaveErrorSignal | null` and `export interface SaveErrorSignal { id: string }` in `lib/store.tsx`. Task 3 reuses the internal `signalSaveError()` callback. The snapshot-capture-inside-setState pattern (impure but idempotent under StrictMode double-invoke) matches the existing `deleteItem` precedent at `lib/store.tsx:255-287`.

- [ ] **Step 1: Add the signal to the store**

In `lib/store.tsx`, add below the `CelebrationSignal` interface (line 58):

```tsx
/** pulses when a background save fails after its optimistic update was rolled back */
export interface SaveErrorSignal {
  id: string;
}
```

Add to `interface StoreValue` (after `celebration`):

```tsx
  saveError: SaveErrorSignal | null;
```

Inside `ListsProvider`, below the `fireCelebration` callback:

```tsx
  const [saveError, setSaveError] = useState<SaveErrorSignal | null>(null);
  const signalSaveError = useCallback(() => {
    setSaveError({ id: makeId("save-error") });
  }, []);
```

Add `saveError` to the `value` object and to BOTH dependency arrays of the `useMemo`.

- [ ] **Step 2: Rewrite the nine fire-and-forget mutators with snapshot rollback**

Each follows the same shape: capture the pre-mutation entity inside the setState updater, and on action failure restore it and pulse the signal. Every rewritten callback gets `[signalSaveError]` as its dependency array (they currently have `[]`).

`setListView` (replaces lines 150-156):

```tsx
  const setListView = useCallback<StoreValue["setListView"]>((listId, view) => {
    let before: List | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l;
        return { ...l, defaultView: view };
      })
    );
    if (isTempId(listId)) return; // not persisted yet; the swap will carry the view
    void setListViewAction(listId, view).catch((err) => {
      console.error("setListView failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? snap : l)));
      signalSaveError();
    });
  }, [signalSaveError]);
```

`updateList` (replaces lines 158-179) — same capture in its existing `prev.map`, setting `before = l` just before building `next`; on catch, restore `before` by id and `signalSaveError()`. Full replacement:

```tsx
  const updateList = useCallback<StoreValue["updateList"]>((listId, patch) => {
    let before: List | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l;
        const next = { ...l, ...patch };
        if (patch.template !== undefined) {
          const meta = deriveListMeta(patch.template);
          next.noun = meta.noun;
          next.kind = meta.kind;
        }
        return next;
      })
    );
    if (isTempId(listId)) return;
    void updateListAction(listId, {
      title: patch.title,
      emoji: patch.emoji,
      theme: patch.theme,
      template: patch.template,
      defaultView: patch.defaultView,
    }).catch((err) => {
      console.error("updateList failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? snap : l)));
      signalSaveError();
    });
  }, [signalSaveError]);
```

`setListPinned` (replaces lines 181-187): identical shape to `setListView`, patching `{ ...l, pinned }` and calling `setListPinnedAction(listId, pinned)`.

`updateItem` (replaces lines 234-253):

```tsx
  const updateItem = useCallback<StoreValue["updateItem"]>((listId, itemId, patch, opts) => {
    let before: Item | undefined;
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) => {
                if (i.id !== itemId) return i;
                before = i;
                return { ...i, ...patch };
              }),
            }
          : l
      )
    );
    if (isTempId(itemId)) return; // will be persisted with its values on creation
    if (opts?.persist === false) return; // local-only; a trailing write flushes later
    void updateItemAction(itemId, {
      title: patch.title,
      subtitle: patch.subtitle,
      note: patch.note,
      status: patch.status,
      tags: patch.tags,
      emoji: patch.emoji,
      rating: patch.rating,
    }).catch((err) => {
      console.error("updateItem failed", err);
      const snap = before;
      if (snap) {
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? { ...l, items: l.items.map((i) => (i.id === itemId ? snap : i)) }
              : l
          )
        );
      }
      signalSaveError();
    });
  }, [signalSaveError]);
```

`updatePerson` (replaces lines 344-354): capture `before = p` inside its `prev.map`, restore by id on catch + signal.

`updatePersonDetail` (replaces lines 362-381): a cross-section move is hard to invert precisely, so capture the whole array:

```tsx
  const updatePersonDetail = useCallback<StoreValue["updatePersonDetail"]>(
    (personId, fromSectionId, detailId, patch) => {
      const toSectionId = patch.toSectionId ?? fromSectionId;
      let before: Person[] | undefined;
      setPeople((prev) => {
        before = prev;
        return moveDetailBetweenSections(prev, personId, fromSectionId, toSectionId, detailId, {
          title: patch.title,
          note: patch.note,
          tags: patch.tags,
        });
      });
      if (isTempId(detailId)) return;
      void updatePersonDetailAction(detailId, {
        title: patch.title,
        note: patch.note,
        tags: patch.tags,
        sectionId: patch.toSectionId,
      }).catch((err) => {
        console.error("updatePersonDetail failed", err);
        if (before) setPeople(before);
        signalSaveError();
      });
    },
    [signalSaveError]
  );
```

`setProfileTheme` (replaces lines 385-390) and `dismissChecklist` (replaces lines 392-397): capture `let before: Profile | undefined;` via `setProfile((p) => { before = p; return { ...p, theme }; });` (respectively `checklistDismissed: true`), restore with `if (before) setProfile(before);` + signal on catch.

`clearExamples` (replaces lines 399-404): capture the whole lists array (`before = prev` inside the updater), restore + signal on catch.

- [ ] **Step 3: Create the bridge component**

Create `components/save-error-toast.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";

/** Bridges the store's save-failure signal into the toast channel. The store
 *  sits above UiProvider, so it can't show toasts itself; this tiny component
 *  lives inside both providers and translates. */
export function SaveErrorToast() {
  const { saveError } = useStore();
  const { showToast } = useUi();

  useEffect(() => {
    if (!saveError) return;
    showToast("That didn't save. Let's try again 🌿");
  }, [saveError, showToast]);

  return null;
}
```

- [ ] **Step 4: Mount it in the shell**

In `components/app-shell.tsx`: add `import { SaveErrorToast } from "./save-error-toast";` and render `<SaveErrorToast />` directly after `<Toast />` (line 48).

- [ ] **Step 5: Verify rollback end-to-end**

Temporarily add `throw new Error("simulated failure");` as the first line of `updateItemAction` in `lib/actions.ts`. In the running app open "Movies I Want to Watch", expand Paddington 2, tap "Watched". Expected: the pill flips, then within a second flips BACK to "Want to watch" and the toast "That didn't save. Let's try again 🌿" appears. Remove the throw. Repeat the tap; expected: sticks, no toast, survives a reload.

- [ ] **Step 6: Test suite, typecheck, commit**

```bash
npm test && npx tsc --noEmit
git add lib/store.tsx components/save-error-toast.tsx components/app-shell.tsx
git commit -m "fix(trust): rollback + warm toast when background saves fail

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Undo for list/person/detail deletes via deferred server delete

Item deletes have Undo; list/person/detail deletes (the bigger destructive acts) have none and no failure rollback. Convert them to the deferred pattern: remove locally at confirm time, only send the server delete when the undo toast expires (or is replaced/unmounted), and Undo restores locally without any server call. Also add hover/focus pause to the toast so the 6s undo window is forgiving.

**Files:**
- Modify: `lib/ui.tsx` (toast gains `onExpire`)
- Modify: `components/toast.tsx` (expire/commit lifecycle + pause on hover/focus)
- Modify: `lib/store.tsx` (`deleteList`, `deletePerson`, `deletePersonDetail` return handles)
- Modify: `components/list-card.tsx:56-69`, `app/app/(main)/list/[id]/page.tsx:86-99`, `app/app/(main)/person/[id]/page.tsx:54-65,118-129` (call sites)

**Interfaces:**
- Consumes: `signalSaveError` from Task 2; `insertDetail`/`removeDetail` from `lib/store-helpers.ts` (existing: `insertDetail(people, personId, sectionId, entry)` prepends an entry; `removeDetail(people, personId, sectionId, detailId)`).
- Produces: `export interface DeleteHandle { undo: () => void; commit: () => void }` in `lib/store.tsx`. New signatures: `deleteList(listId): DeleteHandle`, `deletePerson(personId): DeleteHandle`, `deletePersonDetail(personId, sectionId, detailId): DeleteHandle`. New field `onExpire?: () => void` on `ToastOptions` and `ToastSignal` in `lib/ui.tsx`, with the guarantee: **exactly one of `onAction` or `onExpire` eventually runs per toast** (expire also fires if the toast is replaced or the toaster unmounts before timeout).

- [ ] **Step 1: Extend the toast contract in `lib/ui.tsx`**

Add `onExpire?: () => void;` to both `ToastOptions` (line 33-35) and `ToastSignal` (line 37-41). In `showToast` (line 93-96), carry it through: `setToast({ id: toastSeq.current, message, action: opts?.action, onExpire: opts?.onExpire });`.

- [ ] **Step 2: Rewrite `components/toast.tsx` with the commit lifecycle and pause**

Replace the whole file with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUi, type ToastSignal } from "@/lib/ui";
import { softSpring } from "@/lib/motion";
import { focusRingOnDark } from "@/lib/a11y";

/** A tiny, warm confirmation that floats just above the bottom nav. */
export function Toast() {
  const { toast, dismissToast } = useUi();
  // The toast id whose action already fired. The exiting toast stays pointer-interactive
  // during the AnimatePresence exit (~0.5s) with a frozen onClick closure, so this shared
  // ref is what guarantees onAction runs at most once per toast instance.
  const firedActionFor = useRef<number | null>(null);
  // The toast id whose onExpire already fired (via timeout), so the settle
  // effect below never double-commits.
  const expiredFor = useRef<number | null>(null);
  // Hovering or focusing the toast pauses auto-dismiss, so the Undo window
  // never closes under a finger or a keyboard user.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!toast || paused) return;
    const t = setTimeout(() => {
      if (firedActionFor.current !== toast.id) {
        expiredFor.current = toast.id;
        toast.onExpire?.();
      }
      dismissToast(toast.id);
    }, toast.action ? 6000 : 2400);
    return () => clearTimeout(t);
  }, [toast, paused, dismissToast]);

  // Settle a toast that disappears WITHOUT its timeout firing (replaced by a
  // newer toast, or dismissed after an action): if neither its action nor its
  // expiry ran, its pending work must still commit exactly once.
  const prevToastRef = useRef<ToastSignal | null>(null);
  useEffect(() => {
    const prev = prevToastRef.current;
    if (prev && prev.id !== toast?.id) {
      if (firedActionFor.current !== prev.id && expiredFor.current !== prev.id) {
        expiredFor.current = prev.id;
        prev.onExpire?.();
      }
    }
    prevToastRef.current = toast;
    if (toast?.id !== prev?.id) setPaused(false);
  }, [toast]);

  // Unmount safety: commit whatever is still pending.
  useEffect(
    () => () => {
      const cur = prevToastRef.current;
      if (cur && firedActionFor.current !== cur.id && expiredFor.current !== cur.id) {
        cur.onExpire?.();
      }
    },
    []
  );

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="relative w-full max-w-[440px]">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96, pointerEvents: "none" }}
              transition={softSpring}
              onPointerEnter={() => setPaused(true)}
              onPointerLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              className="pointer-events-auto absolute inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] mx-auto flex w-fit max-w-[88%] items-center gap-2 rounded-pill bg-ink px-4 py-3 text-cream shadow-lift"
            >
              <span className="text-[0.92rem] font-bold leading-none">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    if (firedActionFor.current === toast.id) return;
                    firedActionFor.current = toast.id;
                    toast.action?.onAction();
                    // only clear if this toast is still the live one — a fading
                    // toast's Undo must not kill a newer toast underneath it
                    dismissToast(toast.id);
                  }}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-pill px-2 text-[0.92rem] font-bold leading-none text-cream underline underline-offset-2 ${focusRingOnDark}`}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

(Note: `ToastSignal` must be exported from `lib/ui.tsx`; it already is.)

- [ ] **Step 3: Convert the three store deletes to handles**

In `lib/store.tsx`, add near `SaveErrorSignal`:

```tsx
/** returned by the deferred deletes: exactly one of undo/commit should run */
export interface DeleteHandle {
  undo: () => void;
  commit: () => void;
}
```

Change the `StoreValue` signatures:

```tsx
  deleteList: (listId: string) => DeleteHandle;
  deletePerson: (personId: string) => DeleteHandle;
  deletePersonDetail: (personId: string, sectionId: string, detailId: string) => DeleteHandle;
```

Replace `deleteList` (lines 189-193):

```tsx
  // Deferred delete: the list leaves the UI now, but the server delete only
  // fires on commit() (when the Undo toast expires). undo() simply restores
  // local state — nothing was sent, so nothing needs recreating.
  const deleteList = useCallback<StoreValue["deleteList"]>((listId) => {
    let removed: { list: List; index: number } | null = null;
    setLists((prev) => {
      const index = prev.findIndex((l) => l.id === listId);
      if (index === -1) return prev;
      removed = { list: prev[index], index };
      return prev.filter((l) => l.id !== listId);
    });
    const restore = () => {
      const snap = removed;
      if (!snap) return;
      setLists((prev) => {
        const next = [...prev];
        next.splice(Math.min(snap.index, next.length), 0, snap.list);
        return next;
      });
    };
    let settled = false;
    return {
      undo: () => {
        if (settled) return;
        settled = true;
        restore();
      },
      commit: () => {
        if (settled) return;
        settled = true;
        if (isTempId(listId)) return;
        void deleteListAction(listId).catch((err) => {
          console.error("deleteList failed", err);
          restore();
          signalSaveError();
        });
      },
    };
  }, [signalSaveError]);
```

Replace `deletePerson` (lines 356-360) with the identical shape over `setPeople` / `deletePersonAction` (snapshot `{ person: Person; index: number }`).

Replace `deletePersonDetail` (lines 333-342):

```tsx
  const deletePersonDetail = useCallback<StoreValue["deletePersonDetail"]>(
    (personId, sectionId, detailId) => {
      let removedEntry: PersonDetailEntry | null = null;
      setPeople((prev) => {
        const person = prev.find((p) => p.id === personId);
        removedEntry =
          person?.sections.find((s) => s.id === sectionId)?.entries.find((e) => e.id === detailId) ?? null;
        return removeDetail(prev, personId, sectionId, detailId);
      });
      const restore = () => {
        const snap = removedEntry;
        if (!snap) return;
        setPeople((prev) => insertDetail(prev, personId, sectionId, snap));
      };
      let settled = false;
      return {
        undo: () => {
          if (settled) return;
          settled = true;
          restore();
        },
        commit: () => {
          if (settled) return;
          settled = true;
          if (isTempId(detailId)) return;
          void deletePersonDetailAction(detailId).catch((err) => {
            console.error("deletePersonDetail failed", err);
            restore();
            signalSaveError();
          });
        },
      };
    },
    [signalSaveError]
  );
```

- [ ] **Step 4: Update the three call sites**

`components/list-card.tsx` delete item (lines 65-68) becomes:

```tsx
                onConfirm: () => {
                  const handle = deleteList(list.id);
                  showToast("Removed from your little world", {
                    action: { label: "Undo", onAction: handle.undo },
                    onExpire: handle.commit,
                  });
                },
```

`app/app/(main)/list/[id]/page.tsx` (lines 94-98) becomes:

```tsx
              onConfirm: () => {
                const handle = deleteList(list.id);
                showToast("Removed from your little world", {
                  action: { label: "Undo", onAction: handle.undo },
                  onExpire: handle.commit,
                });
                router.replace("/app");
              },
```

`app/app/(main)/person/[id]/page.tsx` person delete (lines 60-64) becomes:

```tsx
              onConfirm: () => {
                const handle = deletePerson(person.id);
                showToast("Gone, along with their little details", {
                  action: { label: "Undo", onAction: handle.undo },
                  onExpire: handle.commit,
                });
                router.replace("/app/people");
              },
```

and the detail delete (lines 124-127) becomes (note the new, size-appropriate copy — the audit flagged that the smallest delete read the same as the biggest):

```tsx
                    onConfirm: () => {
                      const handle = deletePersonDetail(person.id, s.id, detailId);
                      showToast("Removed that little detail", {
                        action: { label: "Undo", onAction: handle.undo },
                        onExpire: handle.commit,
                      });
                    },
```

- [ ] **Step 5: Verify all four behaviors in the running app**

1. Home: delete "Books" via its ⋯ menu, tap Undo within 6s. Expected: card returns; reload; Books still exists with its items.
2. Delete "Books" again, let the toast expire. Expected: gone; reload; still gone.
3. Person "Priya": delete her food detail, Undo. Expected: chip returns; reload; still there.
4. Hover the undo toast for >6s. Expected: it stays while hovered, dismisses after leaving.

- [ ] **Step 6: Test suite, typecheck, commit**

```bash
npm test && npx tsc --noEmit
git add lib/ui.tsx components/toast.tsx lib/store.tsx components/list-card.tsx "app/app/(main)/list/[id]/page.tsx" "app/app/(main)/person/[id]/page.tsx"
git commit -m "feat(trust): undo for list/person/detail deletes via deferred server delete, toast pause on hover

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Grid view expanded editor spans the full row

Tapping a grid tile expands the inline editor inside its half-width column (~176px form fields, empty right column). The expansion state lives inside `ExpandableCard`, but its summary button exposes `aria-expanded` — so the grid cell can react with a CSS `:has()` variant, no state threading.

**Files:**
- Modify: `app/app/(main)/list/[id]/page.tsx:132,240`

**Interfaces:**
- Consumes: `ExpandableCard` renders `aria-expanded={open}` on its summary button (`components/expandable-card.tsx:49`) — unchanged.
- Produces: nothing.

- [ ] **Step 1: Make the grid cell full-width while expanded**

In `app/app/(main)/list/[id]/page.tsx`, replace line 132:

```tsx
  const rowClass = view === "list" ? "[content-visibility:auto] [contain-intrinsic-size:auto_64px]" : undefined;
```

with:

```tsx
  const rowClass =
    view === "list"
      ? "[content-visibility:auto] [contain-intrinsic-size:auto_64px]"
      : view === "grid"
        ? // an expanded editor needs the whole row, not half a grid column
          "has-[[aria-expanded=true]]:col-span-full"
        : undefined;
```

- [ ] **Step 2: Verify at 390 and 320**

In the running app at 390x844, open Movies, switch to grid view, tap the Amélie tile. Expected: the tile + editor stretch across both columns; the note textarea is full width with no scrollbar; other tiles reflow below. Collapse it; expected: returns to its half-width slot. Repeat at 320x568.

- [ ] **Step 3: Commit**

```bash
git add "app/app/(main)/list/[id]/page.tsx" && git commit -m "fix(grid): expanded inline editor spans the full row

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Compact row stops starving the title

At 320px the title truncates to one character ("C." for Coraline) because the example chip and status pill won't shrink. Give the title flex priority and move the example chip down to the subtitle line.

**Files:**
- Modify: `components/compact-row.tsx:28-61`

**Interfaces:**
- Consumes: `ExampleChip` from `./chip` (already `shrink-0` internally).
- Produces: nothing.

- [ ] **Step 1: Restructure the text block**

In `components/compact-row.tsx`, replace lines 28-61 (the `min-w-0 flex-1` div) with:

```tsx
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="min-w-0 flex-1 truncate font-display text-[0.98rem] font-semibold leading-tight text-ink">
            {item.title}
          </h3>
          {item.rating ? (
            <span
              role="img"
              className="flex shrink-0 items-center gap-px leading-none"
              style={{ color: "var(--color-rating)" }}
              aria-label={`${item.rating} stars`}
            >
              {Array.from({ length: item.rating }, (_, i) => (
                <LittleIcon key={i} name="star-tiny" size={11} />
              ))}
            </span>
          ) : (
            item.status === "favorite" && (
              <span role="img" className="shrink-0 leading-none text-rosewood" aria-label="favorite">
                <LittleIcon name="heart-tiny" size={11} />
              </span>
            )
          )}
          {item.note && (
            <span role="img" className="shrink-0 text-brown opacity-55" aria-label="has a note">
              <LittleIcon name="pencil" size={12} />
            </span>
          )}
        </div>
        {(item.subtitle || isExample(item.tags)) && (
          <div className="mt-0.5 flex items-center gap-1.5">
            {item.subtitle && (
              <p className="min-w-0 truncate text-[0.82rem] font-semibold text-brown-soft">{item.subtitle}</p>
            )}
            {isExample(item.tags) && <ExampleChip />}
          </div>
        )}
      </div>
```

The only changes from the current markup: `min-w-0 flex-1` on the h3, and the `ExampleChip` moved from the title row into a shared second line with the subtitle.

- [ ] **Step 2: Verify at 320 and 390**

Movies list, compact view, 320x568: "Coraline" reads as at least "Coralin…" (not "C."), with "example" on the line below next to the year. At 390: "Pride & Prejudice" shows more characters than before. No horizontal overflow.

- [ ] **Step 3: Commit**

```bash
git add components/compact-row.tsx && git commit -m "fix(compact): title gets flex priority; example chip moves to the subtitle line

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Cozy view pencil no longer clips the status pill

The tap-to-edit pencil hint (`item-card.tsx:294-301`, absolute `right-2 top-2`, 24px wide) overlaps the status pill on every cozy row (~18px into content: card padding is 14px, pencil extends 32px in). Clear it with padding on the title row.

**Files:**
- Modify: `components/note-card.tsx:29`

**Interfaces:** none.

- [ ] **Step 1: Add clearance**

In `components/note-card.tsx` line 29, change:

```tsx
        <div className="flex items-start gap-1.5">
```

to:

```tsx
        {/* pr-5 clears the absolute pencil edit hint the parent card overlays top-right */}
        <div className="flex items-start gap-1.5 pr-5">
```

- [ ] **Step 2: Verify**

Movies list, cozy view, 390 and 320: every row's status pill ("Want to watch") renders fully, no clipping under the pencil circle. Grid view unaffected (pencil floats over poster art there, which is fine).

- [ ] **Step 3: Commit**

```bash
git add components/note-card.tsx && git commit -m "fix(cozy): status pill clears the edit-hint pencil

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Kill iOS focus-zoom (all inputs to 16px)

Safari zooms the viewport when a focused input's font-size is under 16px. `inputField` is 0.95rem (15.2px) and several one-offs are smaller.

**Files:**
- Modify: `lib/field.ts:11`
- Modify: `components/item-card.tsx:90,178,192`
- Modify: `app/app/(main)/list/[id]/page.tsx:169`
- Modify: `app/app/(main)/page.tsx:137`

**Interfaces:** none (pure class strings).

- [ ] **Step 1: Bump the shared field**

`lib/field.ts` line 11: change `text-[0.95rem]` to `text-[1rem]` in `inputField`. (`inputPrimary` at 1.05rem is already safe; `textareaField` inherits the fix.)

- [ ] **Step 2: Bump the one-offs**

- `components/item-card.tsx:90` (title input): `text-[0.95rem]` → `text-[1rem]`
- `components/item-card.tsx:178` (note textarea): `text-[0.9rem]` → `text-[1rem]`
- `components/item-card.tsx:192` (tags input): `text-[0.9rem]` → `text-[1rem]`
- `app/app/(main)/list/[id]/page.tsx:169` (in-list search): `text-[0.9rem]` → `text-[1rem]`
- `app/app/(main)/page.tsx:137` (home search): `text-[0.98rem]` → `text-[1rem]`

- [ ] **Step 3: Confirm no sub-16px inputs remain**

```bash
grep -rn "text-\[0\.\(8\|9\)" app components lib --include="*.ts*" | grep -i "input\|textarea\|select" 
```

Expected: no matches on `<input>`/`<textarea>`/`<select>` class lines (labels/placeholder-less spans are fine). Then visually check the add-item sheet and item editor at 390: fields look right, nothing wraps oddly.

- [ ] **Step 4: Commit**

```bash
git add lib/field.ts components/item-card.tsx "app/app/(main)/list/[id]/page.tsx" "app/app/(main)/page.tsx"
git commit -m "fix(mobile): 16px input font everywhere so iOS Safari never focus-zooms

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: "Their day" month select stops collapsing

In the add/edit-person sheet at 390 the month `<select>` collapses to a ~37px chevron-only control. Cause: `inputField` contains `w-full` and the select adds `flex-1` (flex-basis 0%), letting it shrink to nothing while the day input holds its width. Let the select's `w-full` do the work and pin the day input.

**Files:**
- Modify: `components/person-form-fields.tsx:131-153`

**Interfaces:** none.

- [ ] **Step 1: Fix the flex row**

In `components/person-form-fields.tsx`: on the month `<select>` (line 136), change `className={`${inputField} flex-1`}` to `className={`${inputField} min-w-0`}`. On the day `<input>` (line 151), change `className={`${inputField} w-20 text-center`}` to `className={`${inputField} w-20 shrink-0 text-center`}`.

- [ ] **Step 2: Verify**

People tab → FAB "Add someone to remember" → 390 and 320: the month select shows the full word "month" (and "January" when picked), taking all width left of the fixed day box. No overflow.

- [ ] **Step 3: Commit**

```bash
git add components/person-form-fields.tsx && git commit -m "fix(people): month select keeps its width in the person sheet

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Onboarding CTA renders "my little worlds" with its space

`Button`'s root is `inline-flex`, so the whitespace between the text node `Take me to my` and the nowrap `<span>` collapses (anonymous flex items swallow inter-item whitespace) → "Take me to mylittle worlds 🌷" on the onboarding peak screen.

**Files:**
- Modify: `components/onboarding/onboarding-flow.tsx:281-283`

**Interfaces:** none.

- [ ] **Step 1: Make the label a single flex item**

Replace lines 281-283:

```tsx
              <Button size="lg" block onClick={finish}>
                Take me to my <span className="whitespace-nowrap">little worlds 🌷</span>
              </Button>
```

with:

```tsx
              <Button size="lg" block onClick={finish}>
                {/* one span: Button is inline-flex, which swallows whitespace between flex items */}
                <span>
                  Take me to my <span className="whitespace-nowrap">little worlds 🌷</span>
                </span>
              </Button>
```

- [ ] **Step 2: Verify**

Reset onboarding for the audit account and walk through:

```bash
echo 'UPDATE "Profile" SET "onboardingCompleted"=false WHERE "name"='"'"'audit-designer'"'"';' | npx prisma db execute --stdin
```

Load `/app` (redirects to onboarding), reach the final screen. Expected: "Take me to my little worlds 🌷" with the space, and "little worlds 🌷" never wraps mid-phrase. Complete onboarding to restore the account state.

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/onboarding-flow.tsx && git commit -m "fix(onboarding): restore the swallowed space in the final CTA

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Landing header holds one line at 320

At 320 the wordmark wraps to two lines, "Log in" wraps, and "Start free" becomes a tall oval.

**Files:**
- Modify: `components/landing/landing-header.tsx:11-34`

**Interfaces:** none.

- [ ] **Step 1: Nowrap + tighter small-screen padding**

Replace the header's inner div (lines 11-34) with:

```tsx
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <Link
          href="/"
          aria-label="Little Lists home"
          className={`inline-flex items-center gap-2 rounded-pill px-1 py-0.5 ${focusRing}`}
        >
          <Sticker name="flower" size={22} />
          <span className="whitespace-nowrap font-display text-[1.12rem] font-semibold text-ink">Little Lists</span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <Link
            href="/sign-in"
            className={`whitespace-nowrap rounded-pill px-3 py-2 text-[0.9rem] font-bold text-brown transition-colors hover:bg-cream-deep sm:px-4 ${focusRing}`}
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className={`whitespace-nowrap rounded-pill bg-ink px-3 py-2 text-[0.9rem] font-bold text-cream shadow-soft transition-colors hover:bg-ink-soft sm:px-4 ${focusRingOnDark}`}
          >
            Start free
          </Link>
        </nav>
      </div>
```

- [ ] **Step 2: Verify**

Sign out (`await window.Clerk.signOut()` via evaluate) or use a fresh tab on `/`. At 320x568: wordmark, "Log in", "Start free" each on one line, no horizontal overflow. At 1280: unchanged look.

- [ ] **Step 3: Commit**

```bash
git add components/landing/landing-header.tsx && git commit -m "fix(landing): header stays on one line at 320px

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Home filters show only what you own, and chips scroll into view

The home rail offers "To hear"/"To taste" even with no music/food lists (dead-end filter), and tapping a half-visible chip doesn't bring it fully on screen (both rails).

**Files:**
- Modify: `app/app/(main)/page.tsx:70-86,141-149`
- Modify: `components/chip.tsx:14,56-58`
- Modify: `components/filter-chips.tsx:29-36`

**Interfaces:**
- Produces: `Chip`'s `onClick` prop becomes `(e: React.MouseEvent<HTMLButtonElement>) => void` (backwards compatible: existing zero-arg callers still typecheck).

- [ ] **Step 1: Pass the event through `Chip`**

`components/chip.tsx` line 14: change `onClick?: () => void;` to `onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;`. (The `motion.button` already forwards its event; no other change.)

- [ ] **Step 2: Filter categories to owned kinds and reset a stranded filter**

In `app/app/(main)/page.tsx`, after the `isFiltering` line (line 70), add:

```tsx
  // only offer type filters the user can actually match — a chip for a kind
  // they own no lists of is a guaranteed dead end
  const categories = useMemo(() => {
    const owned = new Set(lists.map((l) => l.kind));
    return CATEGORIES.filter((c) => !c.kinds || c.kinds.some((k) => owned.has(k)));
  }, [lists]);

  // if the active chip disappears (its last list was deleted), fall back to all
  useEffect(() => {
    if (!categories.some((c) => c.id === cat)) setCat("all");
  }, [categories, cat]);
```

In the rail (line 143), change `{CATEGORIES.map((c) => (` to `{categories.map((c) => (`, and change the chip's onClick (line 144) to scroll itself into view:

```tsx
          <Chip
            key={c.id}
            variant="filter"
            active={cat === c.id}
            onClick={(e) => {
              setCat(c.id);
              e.currentTarget.scrollIntoView({
                behavior: reduce ? "auto" : "smooth",
                inline: "nearest",
                block: "nearest",
              });
            }}
          >
```

- [ ] **Step 3: Same scroll behavior for list-detail status chips**

In `components/filter-chips.tsx`, change the button's onClick (line 32):

```tsx
            onClick={(e) => {
              onChange(opt.id);
              e.currentTarget.scrollIntoView({
                behavior: reduce ? "auto" : "smooth",
                inline: "nearest",
                block: "nearest",
              });
            }}
```

- [ ] **Step 4: Verify**

Home at 390: with the audit account (movie, book, gift, custom-place lists), the rail shows Everything / To watch / To read / Little things and NOT "To hear". At 430: tap a chip that's cut off at the right edge; it slides fully into view. Open Movies at 320 and tap the half-visible "Watched" chip: same.

- [ ] **Step 5: Commit**

```bash
git add "app/app/(main)/page.tsx" components/chip.tsx components/filter-chips.tsx
git commit -m "fix(home): hide filters for unowned kinds; chips scroll into view on tap

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Cover collage clears the ⋯ menu on home cards

On normal (half-width) list cards the `CardStack` collage slides under the absolute ⋯ button (button spans 10-46px from the card's right edge; content padding is only 16px → up to 30px overlap).

**Files:**
- Modify: `components/list-card.tsx:116-118`

**Interfaces:** none.

- [ ] **Step 1: Reserve the corner**

In `components/list-card.tsx`, normal variant (line 116), change:

```tsx
            <div className="pt-0.5">
```

to:

```tsx
            {/* pr-8 keeps the collage clear of the absolute ⋯ menu in the corner */}
            <div className="pt-0.5 pr-8">
```

- [ ] **Step 2: Verify, including the landing mockup claim**

Home at 390 and 1280: on half cards with cover thumbnails (Books, Gift Ideas), the collage no longer touches the ⋯ circle. Also check the audit's landing-mockup claim: on `/` at 768x1024, look at the phone mockup's Books/Foods cards. `PreviewListCard` already has `overflow-hidden` (`components/landing/preview-card.tsx:45`), so bleed onto a neighbor should be impossible; if you still see it, it is this same collage/corner overlap INSIDE the card — the shared fix is to add the same `pr-8` to `components/landing/preview-card.tsx:73`. Apply that only if reproduced.

- [ ] **Step 3: Commit**

```bash
git add components/list-card.tsx components/landing/preview-card.tsx
git commit -m "fix(cards): cover collage clears the overflow menu corner

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(If preview-card.tsx was untouched, drop it from the `git add`.)

---

### Task 13: Labeled home FAB steps back at tiny widths

The 176px "Start a little list" pill covers card content at 320. Below 360px, collapse it to the round + button (the aria-label already carries the meaning).

**Files:**
- Modify: `components/floating-add-button.tsx:50-64`

**Interfaces:** none.

- [ ] **Step 1: Collapse the label under 360px**

In `components/floating-add-button.tsx`, change the button's conditional classes (lines 50-54):

```tsx
          className={`pointer-events-auto absolute bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-5 text-cream shadow-lift ${focusRingOnDark} ${
            onHome
              ? "flex items-center gap-2 rounded-pill px-5 text-[0.95rem] font-bold max-[359px]:w-[60px] max-[359px]:justify-center max-[359px]:px-0"
              : "grid place-items-center rounded-full"
          }`}
```

and hide the label text (line 63):

```tsx
            {onHome && <span className="leading-none max-[359px]:hidden">Start a little list</span>}
```

- [ ] **Step 2: Verify**

Home at 320x568: round + button only, right-aligned, aria-label "Start a little list" still present in the accessibility snapshot. At 390: labeled pill unchanged.

- [ ] **Step 3: Commit**

```bash
git add components/floating-add-button.tsx && git commit -m "fix(fab): labeled pill collapses to the round button under 360px

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: Profile becomes a little archive, not an empty corner

The profile is name + swatches + sign-out + void. Add: an in-voice archive stat line (TDD'd pure helper), an account entry (Clerk's profile modal), a privacy-note link, and a "clear example ideas" home.

**Files:**
- Modify: `lib/visual.ts` (add `archiveSummary`)
- Create: `lib/visual.test.ts`
- Modify: `app/app/(main)/profile/page.tsx`

**Interfaces:**
- Consumes: `useStore().lists/people/clearExamples`, `useUi().openConfirm/showToast`, `isExample(tags)` from `@/lib/onboarding`, `useClerk().openUserProfile` from `@clerk/nextjs`, `focusRingInset` from `@/lib/a11y`. `clearExamples` already has rollback + failure toast from Task 2.
- Produces: `export function archiveSummary(lists: List[], people: Person[]): string` in `lib/visual.ts`, e.g. `"3 little worlds · 14 little things · 1 person remembered"` (people part omitted when there are none).

- [ ] **Step 1: Write the failing test**

Create `lib/visual.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { archiveSummary } from "./visual";
import type { List, Person } from "./types";

const list = (items: number): List =>
  ({ id: "l", title: "t", emoji: "✨", theme: "blush", noun: "thing", kind: "custom", template: "custom", pinned: false, items: Array.from({ length: items }, (_, i) => ({ id: `i${i}`, type: "custom", title: "x" })) }) as unknown as List;
const person = (): Person => ({ id: "p", name: "n", emoji: "✨", theme: "blush", note: "", sections: [] }) as unknown as Person;

describe("archiveSummary", () => {
  it("pluralizes worlds and things", () => {
    expect(archiveSummary([list(2), list(3)], [])).toBe("2 little worlds · 5 little things");
  });
  it("uses singular forms", () => {
    expect(archiveSummary([list(1)], [person()])).toBe(
      "1 little world · 1 little thing · 1 person remembered"
    );
  });
  it("counts people with plural", () => {
    expect(archiveSummary([], [person(), person()])).toBe(
      "0 little worlds · 0 little things · 2 people remembered"
    );
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- visual`
Expected: FAIL, `archiveSummary` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `lib/visual.ts` (it already imports `List`; extend the type import to include `Person`):

```ts
/** the profile's archive line: "3 little worlds · 14 little things · 2 people remembered" */
export function archiveSummary(lists: List[], people: Person[]): string {
  const worlds = lists.length;
  const things = lists.reduce((n, l) => n + l.items.length, 0);
  const parts = [
    `${worlds} little ${worlds === 1 ? "world" : "worlds"}`,
    `${things} little ${things === 1 ? "thing" : "things"}`,
  ];
  if (people.length > 0) {
    parts.push(`${people.length} ${people.length === 1 ? "person" : "people"} remembered`);
  }
  return parts.join(" · ");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- visual`
Expected: 3 passing.

- [ ] **Step 5: Rebuild the profile page**

Replace `app/app/(main)/profile/page.tsx` in full:

```tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SignOutButton, useClerk } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { ITEM_TYPE_META } from "@/lib/types";
import { isExample } from "@/lib/onboarding";
import { archiveSummary } from "@/lib/visual";
import { focusRing, focusRingInset } from "@/lib/a11y";
import { ProfileHeader } from "@/components/profile-header";
import { Cover } from "@/components/cover";
import { Button } from "@/components/button";
import { LittleIcon } from "@/components/icons/little-icon";

function CornerRow({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.95rem] font-semibold text-ink transition-colors hover:bg-cream-deep ${focusRingInset}`}
    >
      {children}
      <span aria-hidden className="text-brown-soft">›</span>
    </button>
  );
}

export default function ProfileScreen() {
  const { lists, people, clearExamples } = useStore();
  const { openConfirm, showToast } = useUi();
  const { openUserProfile } = useClerk();

  const loved = useMemo(() => {
    const out: { listId: string; item: (typeof lists)[number]["items"][number] }[] = [];
    for (const l of lists) {
      for (const item of l.items) {
        if (item.status === "favorite" || item.status === "love") out.push({ listId: l.id, item });
      }
    }
    return out.slice(0, 10);
  }, [lists]);

  const hasExamples = useMemo(
    () => lists.some((l) => l.items.some((i) => isExample(i.tags))),
    [lists]
  );

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <p className="px-1 text-[0.92rem] font-bold text-brown">Your little corner 🌙</p>
      <div className="mt-3">
        <ProfileHeader />
      </div>

      {/* the archive at a glance */}
      <p className="mt-3 px-1 text-[0.9rem] font-semibold text-brown">
        {archiveSummary(lists, people)}
      </p>

      {/* things you love */}
      {loved.length > 0 && (
        <section className="mt-8" aria-label="A few things you love">
          <h2 className="px-1 font-display text-[1.3rem] font-semibold text-ink">A few things you love</h2>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {loved.map(({ listId, item }) => {
              const isPoster = ITEM_TYPE_META[item.type].aspect !== "note";
              return (
                <Link key={item.id} href={`/app/list/${listId}`} className={`w-[5.5rem] shrink-0 rounded-xl ${focusRing}`}>
                  {isPoster ? (
                    <Cover
                      item={item}
                      badge={<LittleIcon name="heart-tiny" size={13} className="text-rosewood" />}
                      className="shadow-soft ring-1 ring-ink/5"
                      sizes="88px"
                    />
                  ) : (
                    <div className="grid aspect-[2/3] place-items-center rounded-xl bg-cream-deep text-4xl shadow-soft ring-1 ring-line/60">
                      {item.emoji ?? <LittleIcon name="sparkle" size={34} />}
                    </div>
                  )}
                  <p className="mt-1.5 line-clamp-2 text-center text-[0.76rem] font-semibold leading-tight text-ink">
                    {item.title}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* the practical corner: account, privacy, examples */}
      <section className="mt-8" aria-label="Your account">
        <div className="overflow-hidden rounded-2xl bg-paper shadow-soft ring-1 ring-line/40">
          <CornerRow onClick={() => openUserProfile()}>Your account</CornerRow>
          <div className="mx-4 h-px bg-line/60" />
          <Link
            href="/privacy"
            className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.95rem] font-semibold text-ink transition-colors hover:bg-cream-deep ${focusRingInset}`}
          >
            How we look after your little worlds
            <span aria-hidden className="text-brown-soft">›</span>
          </Link>
          {hasExamples && (
            <>
              <div className="mx-4 h-px bg-line/60" />
              <CornerRow
                onClick={() =>
                  openConfirm({
                    title: "Clear the example ideas?",
                    body: "Everything you added yourself stays right where it is.",
                    confirmLabel: "Clear examples",
                    onConfirm: () => {
                      clearExamples();
                      showToast("All yours now ✨");
                    },
                  })
                }
              >
                Clear the example ideas
              </CornerRow>
            </>
          )}
        </div>
      </section>

      <div className="mt-10 mb-4 flex justify-center">
        <SignOutButton>
          <Button variant="soft" size="sm">Sign out of your little world</Button>
        </SignOutButton>
      </div>
    </div>
  );
}
```

Check `/privacy` exists as a route (`app/privacy/page.tsx`); if the route is different (e.g. a landing anchor), point the href at the real privacy page.

- [ ] **Step 6: Verify**

Profile at 390 with the audit account: stat line reads like "4 little worlds · N little things · 1 person remembered"; "Your account" opens the Clerk profile modal; privacy row navigates; "Clear the example ideas" appears (the account has example items), confirms warmly, clears them, and the row disappears. At 1280: the page no longer ends in a void.

- [ ] **Step 7: Test suite, typecheck, commit**

```bash
npm test && npx tsc --noEmit
git add lib/visual.ts lib/visual.test.ts "app/app/(main)/profile/page.tsx"
git commit -m "feat(profile): archive stat line, account + privacy + clear-examples rows

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 15: Warm the remaining Clerk strings

Sign-in placeholder "Enter email or username" and the two most-hit auth errors are stock/robotic against the cozy frame.

**Files:**
- Modify: `app/layout.tsx:10-31`

**Interfaces:**
- Consumes: Clerk's `LocalizationResource` (the `localization` prop is typed; wrong keys fail typecheck/build).

- [ ] **Step 1: Extend the localization object**

In `app/layout.tsx`, extend `clerkLocalization` (keep everything already there) with:

```tsx
  formFieldInputPlaceholder__emailAddress_username: "the name or email you picked",
  unstable__errors: {
    form_identifier_not_found: "We can't find that name or email. One more look?",
    form_password_incorrect: "That password doesn't quite match. Try again 🌿",
  },
```

If `npx tsc --noEmit` rejects a key name, check the installed Clerk types (`node_modules/@clerk/types/dist/localization.d.ts`) for the exact identifier-placeholder and error keys and use those; do not ship `as never` casts or `@ts-expect-error`.

- [ ] **Step 2: Verify**

Sign out; on `/sign-in` at 390 the identifier field shows "the name or email you picked". Enter a nonsense email + password; expected the warm not-found line. Sign back in as the audit account with a wrong password; expected the warm mismatch line; then sign in correctly.

- [ ] **Step 3: Typecheck and commit**

```bash
npx tsc --noEmit && git add app/layout.tsx && git commit -m "feat(voice): warm sign-in placeholder and the two most-common auth errors

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 16: Overflow menu gets real keyboard behavior

The ⋯ menu (entry point for every destructive action) drops focus to `<body>` on close and has `role="menu"` without arrow-key navigation.

**Files:**
- Modify: `components/overflow-menu.tsx:33-48`

**Interfaces:** none (component API unchanged).

- [ ] **Step 1: Focus restore on close**

In `components/overflow-menu.tsx`, add after the mount effect (line 31):

```tsx
  // Return focus to the trigger when the menu closes (Escape, selection, or
  // tap-away), per the WAI-ARIA menu-button pattern.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);
```

- [ ] **Step 2: Arrow-key / Home / End navigation**

Replace the Escape-only keydown effect (lines 33-38) with:

```tsx
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const nodes = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]') ?? []
      );
      if (nodes.length === 0) return;
      e.preventDefault();
      const idx = nodes.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? nodes.length - 1
            : e.key === "ArrowDown"
              ? (idx + 1 + nodes.length) % nodes.length
              : (idx - 1 + nodes.length) % nodes.length;
      nodes[next]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
```

- [ ] **Step 3: Verify with the keyboard**

In the running app (list detail): Tab to the ⋯ button, Enter to open (focus lands on "Edit list"), ArrowDown cycles to "Delete list" and wraps, End/Home jump, Escape closes AND focus is back on the ⋯ button (check `document.activeElement` via evaluate). Select "Edit list" with Enter; after the sheet closes, focus returns to the trigger.

- [ ] **Step 4: Commit**

```bash
git add components/overflow-menu.tsx && git commit -m "fix(a11y): overflow menu restores focus and supports arrow-key navigation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 17: Doc drift + whole-branch verification

**Files:**
- Modify: `DESIGN.md` (bottom-nav note)
- No other code changes: this is the gate.

- [ ] **Step 1: Fix the stale DESIGN.md note**

In `DESIGN.md`, the bottom-nav bullet ends with "Note: outer wrapper has no safe-area inset yet." Replace that sentence with: "Safe-area inset handled via `mb-[max(0.75rem,env(safe-area-inset-bottom))]`."

- [ ] **Step 2: Full gates**

```bash
npm test && npx tsc --noEmit && npm run lint; npm run build
```

Expected: tests green; tsc clean; lint shows ONLY the 4 pre-existing errors + 1 warning; build succeeds.

- [ ] **Step 3: End-to-end smoke pass (Playwright, 390x844 unless noted)**

1. Landing at 320: one-line header. 2. Sign in (warm placeholder visible). 3. Home: no "To hear" chip; collage clear of ⋯. 4. Movies: grid expand spans full row (also at 320); compact view titles readable at 320; cozy pills unclipped. 5. Edit an item status; survives reload. 6. Delete Books → Undo → reload → intact. 7. Person sheet month select full-width. 8. Profile: stats + rows work. 9. Keyboard: ⋯ menu arrows + focus restore.

- [ ] **Step 4: Commit and hand off**

```bash
git add DESIGN.md && git commit -m "docs: DESIGN.md bottom-nav safe-area note is stale

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Then follow superpowers:finishing-a-development-branch (merge to main fast-forward, as with the previous audit branch).

---

## Explicitly out of scope (post-beta, per the audit)

Type-scale consolidation, heading-scale inversion, icon stroke unification, shaped skeletons, FAB-bob calm review, vibe-picker grouping, deprecated `Sticker` cleanup, dead type-picker removal in add-item-modal, search live-region, birthday on person cards, "Add '{query}' as your own" search row, native browser validation bubbles on auth (Clerk-owned).

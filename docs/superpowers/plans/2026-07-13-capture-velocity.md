# Capture Velocity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One-step item adds everywhere: tap a search result or press Enter and the thing is saved, with the details screen becoming opt-in.

**Architecture:** All changes live in the existing add-item flow. `lib/types.ts` gains a per-template capture-default status helper; `lib/actions.ts`'s `CreateItemInput` gains an analytics-only `flow` field; `components/add-item-modal.tsx` is refactored so saving takes explicit arguments (not component state), then quick-save paths are added on top. No schema change, no new files except one test.

**Tech Stack:** Next 16 / React 19, Vitest (node env, no component tests — UI verified live via the `verify` skill), Prisma server actions.

**Spec:** `docs/superpowers/specs/2026-07-13-capture-velocity-design.md`

## Global Constraints

- Copy is warm-voice, no em dashes, no robotic labels (PRODUCT.md house style).
- `AnalyticsEvent.properties` allows categorical/boolean/count values only — `flow` is `"quick" | "detailed"`, never free text.
- `prisma migrate dev` is unavailable non-interactively — irrelevant here (no migration).
- `npm run build` must pass before merge (only gate that catches RSC breaks). Lint stays at 0 errors 0 warnings.
- The repo smoke account is `s0smoke+clerk_test@example.com` (Clerk dev code 424242).

---

### Task 1: Capture-default status per template

**Files:**
- Modify: `lib/types.ts` (the template-meta interface containing `statuses: StatusId[]` at ~line 253; the `food` entry at ~line 331; the `custom` entry near the end of `TEMPLATE_META`; new helper next to `statusesForList` at ~line 421)
- Test: `lib/types.test.ts` (create)

**Interfaces:**
- Consumes: existing `TEMPLATE_META`, `ListTemplate`, `StatusId` from `lib/types.ts`.
- Produces: `captureStatusFor(template: ListTemplate): StatusId | undefined` — Task 4 imports this in the modal.

- [ ] **Step 1: Write the failing test**

```ts
// lib/types.test.ts
import { describe, expect, it } from "vitest";
import { captureStatusFor } from "./types";

describe("captureStatusFor", () => {
  it("uses the first status where it is already capture-shaped", () => {
    expect(captureStatusFor("movie")).toBe("want-to-watch");
    expect(captureStatusFor("book")).toBe("want-to-read");
    expect(captureStatusFor("place")).toBe("want-to-go");
    expect(captureStatusFor("gift")).toBe("idea");
  });

  it("overrides food to need-to-try (first status is 'love')", () => {
    expect(captureStatusFor("food")).toBe("need-to-try");
  });

  it("returns undefined for custom lists (no honest default)", () => {
    expect(captureStatusFor("custom")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/types.test.ts`
Expected: FAIL — `captureStatusFor` is not exported.

- [ ] **Step 3: Implement**

In the template-meta interface (the one declaring `statuses: StatusId[];`), add:

```ts
  /** status a quick capture saves with; null = save without a status; unset = statuses[0] */
  captureStatus?: StatusId | null;
```

In `TEMPLATE_META.food` add `captureStatus: "need-to-try",` and in `TEMPLATE_META.custom` add `captureStatus: null,` (next to each `statuses` line).

Next to `statusesForList`, add:

```ts
/** the status a quick capture ("save on first intent") applies for a template */
export function captureStatusFor(template: ListTemplate): StatusId | undefined {
  const meta = TEMPLATE_META[template];
  if (meta.captureStatus === null) return undefined;
  return meta.captureStatus ?? meta.statuses[0];
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/types.test.ts` → PASS. Then `npm run lint` → 0 problems.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/types.test.ts
git commit -m "feat(types): per-template capture-default status (food fix, custom none)"
```

---

### Task 2: `flow` property on item_created

**Files:**
- Modify: `lib/actions.ts` (`CreateItemInput` at line 126; the `item_created` `recordProductEvent` in `createItemAction` at ~line 199)
- Test: `lib/actions.analytics.test.ts` (update if it asserts item_created properties)

**Interfaces:**
- Consumes: nothing new.
- Produces: `CreateItemInput.flow?: "quick" | "detailed"` — Task 3/4 pass it from the modal. Recorded as `flow: input.flow ?? "detailed"` so untouched call sites keep truthful values.

- [ ] **Step 1: Add the field**

In `CreateItemInput` (lib/actions.ts:126), add:

```ts
  /** which add flow produced this — analytics only, never persisted to the row */
  flow?: "quick" | "detailed";
```

`itemCreateData` maps DB fields explicitly (verified), so `flow` cannot leak into the row. `fileScrapAction` records `pocket_filed`, not `item_created` — no change there.

- [ ] **Step 2: Record it**

In `createItemAction`'s `recordProductEvent` properties, add `flow: input.flow ?? "detailed",` alongside `hasPerson`/`hasNote`/`hasRating`.

- [ ] **Step 3: Update the analytics test**

Open `lib/actions.analytics.test.ts`; if it asserts the exact `item_created` properties object, extend the expectation with `flow: "detailed"` (call sites in the test don't pass `flow`). If it only asserts the event name, no change.

- [ ] **Step 4: Run gates**

Run: `npx vitest run lib/actions.analytics.test.ts` → PASS; `npm run lint` → 0.

- [ ] **Step 5: Commit**

```bash
git add lib/actions.ts lib/actions.analytics.test.ts
git commit -m "feat(analytics): item_created carries flow quick|detailed"
```

---

### Task 3: Refactor the modal save path to explicit arguments (no behavior change)

**Files:**
- Modify: `components/add-item-modal.tsx` (`persist` at ~line 209, `save` at ~line 251)

**Interfaces:**
- Consumes: existing `addItem`, `fileScrap`, `isDuplicateTitle` (from `@/lib/sort`), `openConfirm`, `showToast` — all already imported.
- Produces: `saveItem(input: CreateItemInput, opts?: { listId?: string })` — the single entry point Task 4's quick paths call. It: resolves the target list, runs the duplicate confirm, then persists (scrap branch via `fileScrap` unchanged, plain branch via `addItem`).

Today `persist()` reads a dozen pieces of component state, which breaks quick-save (a fresh pick's `setState` hasn't committed when we'd save). This task makes the data flow explicit while keeping behavior identical.

- [ ] **Step 1: Restructure**

Replace `persist` and `save` with:

```tsx
  const persist = async (input: CreateItemInput, listId: string) => {
    if (scrap) {
      setSaving(true);
      // deferred file: optimistic now, one transaction on toast expiry, undo restores
      const listTitle = lists.find((l) => l.id === listId)?.title ?? "your list";
      const handle = fileScrap(scrap.id, listId, input);
      onClose();
      showToast(`Filed into ${listTitle} ✨`, {
        action: { label: "Undo", onAction: handle.undo },
        onExpire: handle.commit,
      });
      return;
    }

    const wasEmpty = (lists.find((l) => l.id === listId)?.items.length ?? 0) === 0;
    setSaving(true);
    try {
      const created = await addItem(listId, input);
      // rare milestone: this list just came alive
      if (wasEmpty) fireCelebration("confetti");
      onClose();
      if (input.flow === "quick" && created) {
        const listTitle = lists.find((l) => l.id === listId)?.title ?? "your list";
        showToast(`Saved to ${listTitle} ✨`, {
          action: { label: "Undo", onAction: () => void deleteItem(listId, created.id) },
        });
      } else {
        showToast("Saved to your little world ✨");
      }
    } catch {
      setSaving(false);
      showToast("That didn't save. Let's try again 🌿");
    }
  };

  const saveItem = (input: CreateItemInput, opts?: { listId?: string }) => {
    const listId = opts?.listId ?? targetListId ?? lists[0]?.id;
    if (!listId || saving || !input.title.trim()) return;
    const targetItems = lists.find((l) => l.id === listId)?.items ?? [];
    if (isDuplicateTitle(input.title, targetItems)) {
      openConfirm({
        title: "Already in this list",
        body: `"${input.title.trim()}" is already here. Add it again anyway?`,
        confirmLabel: "Add anyway",
        onConfirm: () => {
          void persist(input, listId);
        },
      });
      return;
    }
    void persist(input, listId);
  };

  const save = () => {
    saveItem({
      type,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      note: note.trim() || undefined,
      status,
      tags: tag.trim() ? [tag.trim()] : undefined,
      emoji: meta.aspect === "note" ? emoji : undefined,
      seed: seed || title,
      imageUrl,
      meta: pickedMeta,
      personId: effectivePersonId,
      flow: "detailed",
    });
  };
```

Add `deleteItem` to the `useStore()` destructuring at the top of `AddItemFlow` (line ~66): `const { lists, people, addItem, addList, addPerson, fileScrap, deleteItem, fireCelebration } = useStore();`

- [ ] **Step 2: Run gates**

`npm run lint` → 0; `npm test` → all pass; `npm run build` → green.

- [ ] **Step 3: Quick manual check (dev server)**

Detailed flow must be byte-identical: add an item via search → details → save; toast reads "Saved to your little world ✨"; duplicate re-add prompts.

- [ ] **Step 4: Commit**

```bash
git add components/add-item-modal.tsx
git commit -m "refactor(add-item): argument-driven saveItem path (no behavior change)"
```

---

### Task 4: Quick-save paths — one-tap pick, Enter-to-save, opt-in details

**Files:**
- Modify: `components/add-item-modal.tsx` (`pickResult` ~line 170, the compose `<input>` ~line 291, the "Add anyway" button ~line 397, the non-searchable footer `<Button>` ~line 414)

**Interfaces:**
- Consumes: `saveItem` (Task 3), `captureStatusFor` (Task 1 — add to the existing `@/lib/types` import), `personField` / `effectiveTemplate` / `searching` / `results` (already in scope).
- Produces: user-visible behavior only.

- [ ] **Step 1: Quick-save helpers**

Below `saveItem` add:

```tsx
  // save on first intent: a picked hit becomes an item immediately (the details
  // screen only appears when it has something essential to ask — see gift below)
  const quickPick = (r: SearchHit) => {
    if (searching) return; // stale hit from the superseded query — ignore
    setPicked(`${searchKind}:${r.sourceId}`);
    // let the chosen row glow for a beat before the sheet slides away
    setTimeout(() => {
      saveItem({
        type,
        title: r.title,
        subtitle: r.subtitle || undefined,
        status: captureStatusFor(effectiveTemplate),
        seed: r.title,
        imageUrl: r.imageUrl,
        meta: r.meta,
        flow: "quick",
      });
    }, 260);
  };

  const quickManual = (text: string) => {
    const value = text.trim();
    if (!value) return;
    saveItem({
      type,
      title: value,
      status: captureStatusFor(effectiveTemplate),
      emoji: meta.aspect === "note" ? emoji : undefined,
      seed: value,
      flow: "quick",
    });
  };
```

Rewire `pickResult` call sites: the result button's `onClick={() => pickResult(r)}` becomes `onClick={() => (personField ? pickResult(r) : quickPick(r))}`. Keep `pickResult` itself (it is the details-path pick, still used by the gift exception).

- [ ] **Step 2: Enter-to-save on the compose input**

On the compose `<input>` (line ~291) add:

```tsx
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                if (personField) {
                  if ((query || title).trim()) continueManual();
                  return;
                }
                if (searchable) {
                  if (results.length > 0 && !searching) quickPick(results[0]);
                  else if (query.trim() && !searching) quickManual(query);
                  return;
                }
                quickManual(query || title);
              }}
```

- [ ] **Step 3: Buttons follow the same rule**

- "Add &quot;x&quot; anyway" (line ~397): `onClick={() => continueManual(query)}` becomes `onClick={() => (personField ? continueManual(query) : quickManual(query))}`.
- Non-searchable footer (line ~414): replace the single Continue button with:

```tsx
                <Button
                  block
                  size="lg"
                  onClick={() => (personField ? continueManual() : quickManual(query || title))}
                  disabled={!(query || title).trim() || saving}
                  className="mt-4"
                >
                  {personField ? "Continue" : "Save it ✨"}
                </Button>
                {!personField && (
                  <button
                    type="button"
                    onClick={() => continueManual()}
                    disabled={!(query || title).trim()}
                    className={`mx-auto mt-3 block rounded-pill text-[0.86rem] font-bold text-brown disabled:opacity-50 ${focusRing}`}
                  >
                    add details first ›
                  </button>
                )}
```

- For searchable templates, add the same quiet affordance after the results container (inside the `searchable` branch, after the `min-h-[8rem]` div), shown only when there is something to carry forward:

```tsx
                {query.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => continueManual(query)}
                    className={`mx-auto mt-3 block rounded-pill text-[0.86rem] font-bold text-brown ${focusRing}`}
                  >
                    add details first ›
                  </button>
                )}
```

- [ ] **Step 4: Run gates**

`npm run lint` → 0; `npm test` → pass; `npm run build` → green.

- [ ] **Step 5: Commit**

```bash
git add components/add-item-modal.tsx
git commit -m "feat(add-item): one-tap pick and Enter save with opt-in details (gift keeps its step)"
```

---

### Task 5: Live verification and merge

**Files:** none (verification only).

Use the `verify` skill (dev server + Playwright; sign in as the smoke account or a fresh `+clerk_test` signup).

- [ ] Movie list: type "heat", Enter picks the top hit → sheet closes, toast `Saved to Movies… ✨` with Undo; Undo removes the item.
- [ ] Movie list: tap a result directly → same quick save; item lands with status "Want to watch".
- [ ] Movie list: repeat the same title → "Already in this list" confirm appears; "Add anyway" saves.
- [ ] Movie list: type nonsense with no results → Enter saves as typed (manual item, placeholder cover).
- [ ] Food list: type "natto", Enter → saves with status "Need to try" (not "Love").
- [ ] Custom list: quick save lands with no status.
- [ ] Gift list: compose still leads to the details step with the person picker; no quick save.
- [ ] "add details first ›" reaches the old details step from both searchable and non-searchable composes.
- [ ] Pocket tap-through: file a scrap through the modal → quick paths work, scrap filing keeps its own "Filed into … Undo" toast.
- [ ] Keyboard-only pass: Enter saves, Escape closes the sheet, focus lands sanely; Enter during IME composition does nothing (code-inspect the `isComposing` guard if IME can't be simulated).
- [ ] `SELECT properties FROM "AnalyticsEvent" WHERE name='item_created' ORDER BY "createdAt" DESC LIMIT 5` shows `flow` values.
- [ ] Gates one last time: `npm run lint` (0), `npm test`, `npm run build`.
- [ ] FF-merge the slice branch to main with a summary commit message; leave push to the user.

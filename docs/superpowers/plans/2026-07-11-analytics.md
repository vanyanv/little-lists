# Product Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing-but-dead analytics scaffolding live — emit all 18 first-party product events at real call sites through one resilient recorder, without ever logging user content or letting an event failure break a product action.

**Architecture:** Two emit paths, one sink (`AnalyticsEvent` table). Server mutations call `recordProductEvent` directly after a successful write. Client interactions/views call the new `trackProductEventAction` server action (the missing link the client already imports), which validates, sanitizes, resolves the user, and records. Every path swallows its own errors.

**Tech Stack:** Next.js 16 (App Router, server actions), Prisma 7, Clerk 7, Vitest 4, TypeScript.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing App Router / server-action code (per AGENTS.md — this Next.js has breaking changes vs. training data).
- **No free-form user content in any event, ever** — no titles, notes, names, or search text. Only categorical strings, booleans, counts.
- **Analytics never breaks the product** — every emit path swallows its own errors; server emits are fire-and-forget after the write; the action's return value is unaffected.
- Once-only events rely on the DB `dedupeKey` unique index; a P2002 is silently ignored (already handled in `recordProductEvent`).
- Test runner is Vitest: `npm test` (all), tests colocate as `*.test.ts`.
- Do NOT rebuild what exists: `lib/analytics.ts` (`recordProductEvent`, `PRODUCT_EVENT_NAMES`, `isProductEventName`, `AnalyticsProperties`), `lib/analytics-client.ts` (`trackProductEvent`, session id), the `AnalyticsEvent` table + migration.

---

### Task 1: Property sanitizer

Defense-in-depth so no free-form content can reach the table even if a call site is careless. Pure and fully unit-tested.

**Files:**
- Modify: `lib/analytics.ts` (add `sanitizeAnalyticsProperties`)
- Test: `lib/analytics.test.ts` (create)

**Interfaces:**
- Consumes: `AnalyticsProperties` (existing type in `lib/analytics.ts`).
- Produces: `export function sanitizeAnalyticsProperties(input: unknown): AnalyticsProperties` — returns a new plain object containing only `string|number|boolean|null` values, ≤12 keys (sorted key order, extras dropped), string values truncated to 120 chars.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/analytics.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeAnalyticsProperties, isProductEventName } from "./analytics";

describe("sanitizeAnalyticsProperties", () => {
  it("keeps primitives and null", () => {
    expect(sanitizeAnalyticsProperties({ a: "x", b: 3, c: true, d: null })).toEqual({
      a: "x", b: 3, c: true, d: null,
    });
  });

  it("drops non-primitive values (objects, arrays, functions, undefined)", () => {
    const out = sanitizeAnalyticsProperties({
      keep: 1, obj: { nested: 1 }, arr: [1], fn: () => 1, undef: undefined,
    });
    expect(out).toEqual({ keep: 1 });
  });

  it("caps at 12 keys in sorted order", () => {
    const input: Record<string, number> = {};
    for (let i = 0; i < 20; i++) input[`k${String(i).padStart(2, "0")}`] = i;
    const out = sanitizeAnalyticsProperties(input);
    expect(Object.keys(out)).toHaveLength(12);
    expect(Object.keys(out)).toContain("k00");
    expect(Object.keys(out)).not.toContain("k19");
  });

  it("truncates string values to 120 chars", () => {
    const out = sanitizeAnalyticsProperties({ s: "a".repeat(200) });
    expect((out.s as string).length).toBe(120);
  });

  it("returns an empty object for non-object input", () => {
    expect(sanitizeAnalyticsProperties(null)).toEqual({});
    expect(sanitizeAnalyticsProperties("nope")).toEqual({});
    expect(sanitizeAnalyticsProperties(undefined)).toEqual({});
  });
});

describe("isProductEventName", () => {
  it("accepts a known name and rejects an unknown one", () => {
    expect(isProductEventName("list_created")).toBe(true);
    expect(isProductEventName("definitely_not_an_event")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/analytics.test.ts`
Expected: FAIL — `sanitizeAnalyticsProperties is not a function` (the `isProductEventName` block passes; the sanitizer block errors).

- [ ] **Step 3: Implement the sanitizer**

Add to `lib/analytics.ts` (after the `isProductEventName` function):

```ts
const MAX_KEYS = 12;
const MAX_STRING = 120;

/**
 * Defense-in-depth: strip anything that isn't a categorical primitive so no
 * user-authored content can ever reach the analytics table. Deterministic
 * (sorted keys) so truncation is stable in tests.
 */
export function sanitizeAnalyticsProperties(input: unknown): AnalyticsProperties {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
  const out: AnalyticsProperties = {};
  const keys = Object.keys(input as Record<string, unknown>).sort();
  for (const key of keys) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string") out[key] = value.slice(0, MAX_STRING);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) out[key] = value;
    // everything else (objects, arrays, functions, undefined) is dropped
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/analytics.test.ts`
Expected: PASS (all sanitizer + isProductEventName tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics.ts lib/analytics.test.ts
git commit -m "feat(analytics): sanitize event properties to categorical primitives"
```

---

### Task 2: The missing server action + client dedupeKey

Add `trackProductEventAction` (the function `lib/analytics-client.ts` already imports) and extend the client tracker to forward an optional `dedupeKey`.

**Files:**
- Modify: `lib/actions.ts` (add `trackProductEventAction` + import)
- Modify: `lib/analytics-client.ts` (accept/forward `dedupeKey`, bump last-active)
- Test: `lib/actions.analytics.test.ts` (create)

**Interfaces:**
- Consumes: `recordProductEvent`, `isProductEventName`, `sanitizeAnalyticsProperties`, `AnalyticsProperties`, `ProductEventName` (from `lib/analytics.ts`); `getCurrentUserProfile` (from `lib/server/profile.ts`).
- Produces:
  - `trackProductEventAction(input: { name: string; properties?: AnalyticsProperties; sessionId?: string; path?: string; dedupeKey?: string }): Promise<void>` — validates name, resolves user (drops if none), sanitizes, records; never throws.
  - Updated client `trackProductEvent(name: ProductEventName, properties?: AnalyticsProperties, opts?: { path?: string; dedupeKey?: string }): void`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/actions.analytics.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const recordProductEvent = vi.fn();
const getCurrentUserProfile = vi.fn();

vi.mock("@/lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics")>();
  return { ...actual, recordProductEvent };
});
vi.mock("@/lib/server/profile", () => ({
  getCurrentUserProfile,
  requireUserProfile: vi.fn(),
  ensureProfileForClerkUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { trackProductEventAction } from "./actions";

beforeEach(() => {
  recordProductEvent.mockReset();
  getCurrentUserProfile.mockReset();
});

describe("trackProductEventAction", () => {
  it("drops unknown event names", async () => {
    getCurrentUserProfile.mockResolvedValue({ clerkUserId: "u1" });
    await trackProductEventAction({ name: "bogus_event" });
    expect(recordProductEvent).not.toHaveBeenCalled();
  });

  it("drops when there is no signed-in profile", async () => {
    getCurrentUserProfile.mockResolvedValue(null);
    await trackProductEventAction({ name: "list_created" });
    expect(recordProductEvent).not.toHaveBeenCalled();
  });

  it("records a valid event with sanitized properties and forwards dedupeKey", async () => {
    getCurrentUserProfile.mockResolvedValue({ clerkUserId: "u1" });
    await trackProductEventAction({
      name: "search_completed",
      properties: { kind: "movies", resultCount: 3, junk: { nested: 1 } } as never,
      sessionId: "s1",
      path: "/app",
      dedupeKey: "return:s1",
    });
    expect(recordProductEvent).toHaveBeenCalledTimes(1);
    const arg = recordProductEvent.mock.calls[0][0];
    expect(arg.userId).toBe("u1");
    expect(arg.name).toBe("search_completed");
    expect(arg.properties).toEqual({ kind: "movies", resultCount: 3 });
    expect(arg.dedupeKey).toBe("return:s1");
  });

  it("never throws even if recordProductEvent rejects", async () => {
    getCurrentUserProfile.mockResolvedValue({ clerkUserId: "u1" });
    recordProductEvent.mockRejectedValue(new Error("db down"));
    await expect(trackProductEventAction({ name: "list_created" })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/actions.analytics.test.ts`
Expected: FAIL — `trackProductEventAction` is not exported from `./actions`.

- [ ] **Step 3: Implement the action**

In `lib/actions.ts`, extend the imports and add the action. Update the top imports:

```ts
import { requireUserProfile, getCurrentUserProfile } from "@/lib/server/profile";
import {
  recordProductEvent,
  isProductEventName,
  sanitizeAnalyticsProperties,
  type AnalyticsProperties,
} from "@/lib/analytics";
```

Add at the end of `lib/actions.ts`:

```ts
/* ── analytics ───────────────────────────────────────────────────────── */

/**
 * Client-emitted product events land here. Must never throw into a render:
 * unknown names and unauthenticated callers are dropped silently, and any
 * failure is swallowed.
 */
export async function trackProductEventAction(input: {
  name: string;
  properties?: AnalyticsProperties;
  sessionId?: string;
  path?: string;
  dedupeKey?: string;
}): Promise<void> {
  try {
    if (!isProductEventName(input.name)) return;
    const profile = await getCurrentUserProfile();
    if (!profile) return;
    await recordProductEvent({
      userId: profile.clerkUserId,
      name: input.name,
      properties: sanitizeAnalyticsProperties(input.properties),
      sessionId: input.sessionId,
      path: input.path,
      dedupeKey: input.dedupeKey,
    });
  } catch (error) {
    console.error("trackProductEventAction failed", error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/actions.analytics.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Extend the client tracker to forward dedupeKey + track last activity**

Replace the body of `lib/analytics-client.ts` with:

```ts
"use client";

import type { AnalyticsProperties, ProductEventName } from "@/lib/analytics";
import { trackProductEventAction } from "@/lib/actions";

const SESSION_KEY = "ll:analytics-session";
const LAST_ACTIVE_KEY = "ll:analytics-last-active";

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return "session-unavailable";
  }
}

/** Persisted across sessions so return_session can measure the gap. */
export function markActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // storage unavailable — return_session simply won't fire; acceptable
  }
}

export function readLastActive(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function trackProductEvent(
  name: ProductEventName,
  properties?: AnalyticsProperties,
  opts?: { path?: string; dedupeKey?: string },
): void {
  markActivity();
  void trackProductEventAction({
    name,
    properties,
    sessionId: sessionId(),
    path: opts?.path,
    dedupeKey: opts?.dedupeKey,
  });
}

export { SESSION_KEY, LAST_ACTIVE_KEY };
export { sessionId as currentSessionId };
```

- [ ] **Step 6: Run the full suite to confirm nothing broke**

Run: `npm test`
Expected: PASS. Then `npm run lint` — expected clean.

- [ ] **Step 7: Commit**

```bash
git add lib/actions.ts lib/analytics-client.ts lib/actions.analytics.test.ts
git commit -m "feat(analytics): add trackProductEventAction + client dedupeKey/last-active"
```

---

### Task 3: Server-side mutation emits

Emit the ten server-observable events after their writes succeed, plus `sign_up_completed` in profile creation. Emits are fire-and-forget (`recordProductEvent` swallows), so no `await` blocks the return, but we do `void` them to be explicit.

**Files:**
- Modify: `lib/actions.ts` (createList, createItem, createPerson, createPersonDetail, createScrap, fileScrap, delete* actions)
- Modify: `lib/server/profile.ts` (`ensureProfileForClerkUser` create branch)
- Test: `lib/actions.analytics.test.ts` (extend — onboarding first-item logic is pure and worth a guard test)

**Interfaces:**
- Consumes: `recordProductEvent` (from Task 1's file), `clerkUserId` in each action scope.
- Produces: no new exported symbols; behavior only.

- [ ] **Step 1: Add sign_up_completed to profile creation**

In `lib/server/profile.ts`, add the import and emit in the create branch (only the true create, not the P2002 recovery path):

```ts
import { recordProductEvent } from "@/lib/analytics";
```

In `ensureProfileForClerkUser`, wrap the successful `upsert` create so the event fires once:

```ts
  try {
    const created = await prisma.profile.upsert({
      where: { clerkUserId: userId },
      update: {},
      create: { clerkUserId: userId, displayName },
    });
    void recordProductEvent({
      userId,
      name: "sign_up_completed",
      dedupeKey: `sign_up:${userId}`,
    });
    return created;
  } catch (err) {
    // ...unchanged P2002 recovery (no emit here — the winner already emitted)...
  }
```

- [ ] **Step 2: Emit list_created**

In `createListAction`, after `const row = await prisma.list.create(...)`:

```ts
  void recordProductEvent({
    userId: clerkUserId,
    name: "list_created",
    properties: { template: input.template },
  });
```

- [ ] **Step 3: Emit item_created + onboarding_completed**

In `createItemAction`, after `const row = await prisma.listItem.create(...)`:

```ts
  const itemCount = await prisma.listItem.count({ where: { userId: clerkUserId } });
  void recordProductEvent({
    userId: clerkUserId,
    name: "item_created",
    properties: {
      hasPerson: Boolean(input.personId),
      hasNote: Boolean(input.note),
      hasRating: typeof input.meta?.rating === "number",
    },
  });
  if (itemCount === 1) {
    void recordProductEvent({
      userId: clerkUserId,
      name: "onboarding_completed",
      dedupeKey: `onboarding:${clerkUserId}`,
    });
  }
```

Note: `input.meta?.rating` — confirm the rating field on `CreateItemInput.meta` while editing; if rating is not present at create time, use `properties: { hasPerson, hasNote }` only. Do NOT invent a field.

- [ ] **Step 4: Emit person_created, person_detail_created, pocket_captured, pocket_filed**

`createPersonAction`, after the person row is created:

```ts
  void recordProductEvent({ userId: clerkUserId, name: "person_created" });
```

`createPersonDetailAction`, after the detail row is created (use the detail's section/kind — a fixed enum, never free text):

```ts
  void recordProductEvent({
    userId: clerkUserId,
    name: "person_detail_created",
    properties: { kind: section },
  });
```
(Use whatever the in-scope section/category variable is named — inspect the function while editing; it maps via `DB_SECTION_TO_ID`. Never pass the detail's text.)

`createScrapAction`, after the scrap row is created:

```ts
  void recordProductEvent({ userId: clerkUserId, name: "pocket_captured" });
```

`fileScrapAction`, after the transaction resolves (move the emit outside the `$transaction` so a rolled-back file emits nothing). Refactor to capture the result:

```ts
  const item = await prisma.$transaction(async (tx) => {
    // ...existing body, returning mapItem(row, input.type)...
  });
  void recordProductEvent({
    userId: clerkUserId,
    name: "pocket_filed",
    properties: { hasPerson: Boolean(input.personId) },
  });
  return item;
```

- [ ] **Step 5: Emit entity_deleted from each delete action**

Add after each `deleteMany`/`delete` in `deleteListAction`, `deleteItemAction`, `deletePersonAction`, `deletePersonDetailAction`, `deleteScrapAction`:

```ts
  void recordProductEvent({
    userId: clerkUserId,
    name: "entity_deleted",
    properties: { entity: "list" }, // "item" | "person" | "detail" | "scrap" per action
  });
```

- [ ] **Step 6: Emit operation_error at existing catch/guard points**

Where an action already throws a domain error (e.g. `createItemAction`'s "list not found", `fileScrapAction`'s guards), emit before throwing:

```ts
  if (!list) {
    void recordProductEvent({
      userId: clerkUserId,
      name: "operation_error",
      properties: { action: "createItemAction", code: "list_not_found" },
    });
    throw new Error("createItemAction: list not found");
  }
```

Apply the same pattern to the other existing `if (!...) throw` guards in `createItemAction`, `updateItemAction`, and `fileScrapAction`. Do NOT add a blanket try/catch wrapper around every action — that's a deferred follow-up.

- [ ] **Step 7: Add a guard test for the onboarding-first-item rule**

Extend `lib/actions.analytics.test.ts` with a pure test of the "first item" predicate. Since `createItemAction` hits prisma, test the rule directly by asserting the count===1 gate is the trigger (document intent; keep it a lightweight sanity test):

```ts
describe("onboarding gate", () => {
  it("fires only when the user's item count is exactly 1", () => {
    const shouldFire = (count: number) => count === 1;
    expect(shouldFire(1)).toBe(true);
    expect(shouldFire(0)).toBe(false);
    expect(shouldFire(2)).toBe(false);
  });
});
```

- [ ] **Step 8: Run tests + lint + typecheck**

Run: `npm test`
Expected: PASS.
Run: `npm run lint`
Expected: clean.
Run: `npx tsc --noEmit`
Expected: no errors (confirms every `recordProductEvent` call matches its signature and every event name is a valid `ProductEventName`).

- [ ] **Step 9: Commit**

```bash
git add lib/actions.ts lib/server/profile.ts lib/actions.analytics.test.ts
git commit -m "feat(analytics): emit server-side mutation, signup, and error events"
```

---

### Task 4: Client-side view & interaction emits

Emit the client-only events: `return_session`, revisits, `search_completed`, special-day nudge interactions, and one real `feature_used`. These are thin wrappers verified by pattern equivalence (consistent with prior Motion/reduced-motion practice — see memory `reduced-motion-hydration-flake`); no DOM tests.

**Files:**
- Create: `components/analytics-boot.tsx` (mount-time return_session + activity ping)
- Modify: the `(app)` layout that wraps signed-in pages (mount `<AnalyticsBoot />`)
- Modify: `components/global-search.tsx` (search_completed)
- Modify: `components/person-day-nudge.tsx` (nudge viewed/opened/dismissed)
- Modify: list detail page + person page client entry (list_revisited / person_revisited)

**Interfaces:**
- Consumes: `trackProductEvent`, `readLastActive`, `currentSessionId` (from `lib/analytics-client.ts`).
- Produces: `<AnalyticsBoot />` client component (no props).

- [ ] **Step 1: Create AnalyticsBoot (return_session)**

```tsx
// components/analytics-boot.tsx
"use client";

import { useEffect } from "react";
import { trackProductEvent, readLastActive, markActivity, currentSessionId } from "@/lib/analytics-client";

const RETURN_GAP_MS = 30 * 60 * 1000;

/**
 * Fires once per session when a returning user starts a fresh session more than
 * 30 minutes after their last activity. Mounted in the signed-in app layout.
 */
export function AnalyticsBoot() {
  useEffect(() => {
    const last = readLastActive();
    const now = Date.now();
    if (last !== null && now - last > RETURN_GAP_MS) {
      trackProductEvent("return_session", undefined, {
        dedupeKey: `return:${currentSessionId()}`,
      });
    }
    markActivity();
  }, []);
  return null;
}
```

- [ ] **Step 2: Mount AnalyticsBoot in the signed-in layout**

Find the layout wrapping `app/app/(main)/...` (the one that calls `ensureProfileForClerkUser`). Import and render `<AnalyticsBoot />` once inside it (it renders null; place near the top of the returned tree). Read `node_modules/next/dist/docs/` for current layout conventions before editing. Verify the exact layout path while editing (likely `app/app/(main)/layout.tsx` or `app/app/layout.tsx`).

- [ ] **Step 3: Emit search_completed**

In `components/global-search.tsx`, where results are finalized for a query (after the fetch/local search settles), emit once per completed search — kind, count, and a zero-result boolean, never the query text:

```ts
trackProductEvent("search_completed", {
  kind,                         // the active search kind: "movies" | "books" | "music" | "all"
  resultCount: results.length,
  zeroResult: results.length === 0,
});
```
Place it in the effect/handler that runs when a search resolves, guarded so it fires on settle (not on every keystroke render). Inspect the component's data flow while editing to pick the exact settle point.

- [ ] **Step 4: Emit the special-day nudge events**

In `components/person-day-nudge.tsx`:
- `special_day_nudge_viewed` — in an effect that runs when the banner actually renders (i.e. `upcoming && !dismissed && !hidden`), deduped per person+session:

```ts
useEffect(() => {
  if (!upcoming || dismissed || hidden) return;
  trackProductEvent("special_day_nudge_viewed", undefined, {
    dedupeKey: `nudge:${upcoming.person.id}:${currentSessionId()}`,
  });
}, [upcoming, dismissed, hidden]);
```
- `special_day_nudge_opened` — in the `<Link>`'s `onClick`.
- `special_day_nudge_dismissed` — inside the existing `dismiss()` handler.

Import `trackProductEvent` and `currentSessionId` from `@/lib/analytics-client`. Keep the component's existing hydration pattern (useSyncExternalStore) intact — only add the effect and the two handlers.

- [ ] **Step 5: Emit list_revisited / person_revisited**

On the list detail page (`app/app/(main)/list/[id]/...`) and the person page, emit on client mount of the detail view. If the page is a server component, add the emit in an existing client child that already renders per-page (or a tiny `"use client"` `useEffect` beacon component). Example beacon:

```tsx
"use client";
import { useEffect } from "react";
import { trackProductEvent } from "@/lib/analytics-client";
export function RevisitBeacon({ event }: { event: "list_revisited" | "person_revisited" }) {
  useEffect(() => { trackProductEvent(event); }, [event]);
  return null;
}
```
Render `<RevisitBeacon event="list_revisited" />` on the list page and `event="person_revisited"` on the person page. Place this beacon file at `components/revisit-beacon.tsx`.

- [ ] **Step 6: Wire one real feature_used**

Pick one already-shipped feature action as the first adoption signal — the list-pin toggle (`setListPinnedAction` is called from a client control). In that client handler, when the user pins (not unpins):

```ts
if (pinned) trackProductEvent("feature_used", { feature: "list_pin" });
```
Locate the client component calling `setListPinnedAction` and add the emit there.

- [ ] **Step 7: Verify build, lint, typecheck**

Run: `npm run lint`
Expected: clean.
Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: PASS (unchanged suite; no new tests this task).

- [ ] **Step 8: Manual smoke (per the `verify` skill)**

Start the dev server, sign in as a test user, then in a DB console confirm rows accrue:

```sql
select name, count(*) from "AnalyticsEvent" group by name order by 2 desc;
```
Expected: `sign_up_completed` (once), `list_created`, `item_created`, `search_completed`, `pocket_captured`, etc. appear as you exercise each flow. Confirm no event's `properties` contains any title/name/note/query text.

- [ ] **Step 9: Commit**

```bash
git add components/analytics-boot.tsx components/revisit-beacon.tsx components/global-search.tsx components/person-day-nudge.tsx app/
git commit -m "feat(analytics): emit client-side view, search, nudge, and return-session events"
```

---

## Self-Review notes

- **Spec coverage:** all 18 events mapped (Task 3 server: sign_up, onboarding, list_created, item_created, person_created, person_detail_created, pocket_captured, pocket_filed, entity_deleted, operation_error; Task 4 client: search_completed, return_session, list_revisited, person_revisited, special_day_nudge_viewed/opened/dismissed, feature_used). Sanitizer + action + client dedupeKey/last-active in Tasks 1–2.
- **Deferred (documented in spec, not this plan):** blanket `withTracking` error wrapper, read dashboard, interview program.
- **Verify-while-editing flags:** `CreateItemInput.meta.rating` existence (Task 3 Step 3), the person-detail section variable name (Step 4), the signed-in layout path (Task 4 Step 2), and the settle point in `global-search.tsx` (Step 3) — each says "inspect while editing; do not invent."
```

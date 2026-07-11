# Product Analytics — Capture-Only Instrumentation

Date: 2026-07-11
Slice: Roadmap #2 (see `2026-07-11-product-roadmap.md`)
Status: Design approved (definitions locked); ready for implementation plan.

## Goal

Turn the existing-but-dead analytics scaffolding into live capture: emit ~18
first-party product events at real call sites, through a single resilient
recorder, without ever logging user-authored content and without any event
failure breaking a product action.

**In scope:** the missing server action, property sanitization, and every emit
call site (server + client).
**Out of scope:** any read UI/dashboard (read via SQL), and the 12-interview
research program.

## What already exists (do not rebuild)

- `lib/analytics.ts` — `recordProductEvent(...)` (server-only, swallows errors,
  swallows P2002), `PRODUCT_EVENT_NAMES` (the 18 names), `isProductEventName`,
  `AnalyticsProperties` type.
- `lib/analytics-client.ts` — `trackProductEvent(name, properties?, path?)`,
  session id in `sessionStorage` (`ll:analytics-session`). Imports
  `trackProductEventAction` from `@/lib/actions` — **which does not exist yet.**
- `AnalyticsEvent` table + migration; `dedupeKey` unique index; `pinned` column.

## Architecture

Two emit paths, one sink.

```
server mutation (lib/actions.ts, profile.ts)
        └─ recordProductEvent(...) ─┐
                                     ├─► AnalyticsEvent table
client interaction/view             │
  trackProductEvent(...)            │
   └─ trackProductEventAction ──────┘  (new server action)
      (validate · resolve user · sanitize · recordProductEvent)
```

- **Server path** — emit inside the action, after the DB write succeeds.
  `clerkUserId` already in scope. No round-trip, cannot be missed.
- **Client path** — `trackProductEvent` → new `trackProductEventAction`.

## New server action — `trackProductEventAction`

Location: `lib/actions.ts`. Signature (called by `lib/analytics-client.ts`):

```ts
trackProductEventAction(input: {
  name: string;
  properties?: AnalyticsProperties;
  sessionId?: string;
  path?: string;
  dedupeKey?: string;   // NEW — client passes for once-per-session events
}): Promise<void>
```

Behavior, in order:
1. If `!isProductEventName(input.name)` → return (drop unknown names).
2. Resolve user via `getCurrentUserProfile()` (NOT `require` — must never throw
   into a page render). If null → return.
3. **Sanitize properties** via `sanitizeAnalyticsProperties` (below).
4. `await recordProductEvent({ userId, name, properties, sessionId, path, dedupeKey })`.

The whole body is wrapped so it can never reject the client call (recordProductEvent
already swallows, but the sanitize/validate steps must too).

`lib/analytics-client.ts` `trackProductEvent` gains an optional 4th arg
`dedupeKey` (or an options object) and forwards it.

## Property sanitizer — `sanitizeAnalyticsProperties`

Location: `lib/analytics.ts` (pure, unit-testable). Defense-in-depth so no
free-form user content can ever reach the table even if a call site is careless.

Rules:
- Accept only `string | number | boolean | null` values; drop everything else
  (objects, arrays, functions, undefined).
- Cap at 12 keys (drop extras deterministically — sorted key order).
- Cap string values at 120 chars.
- Return a new plain object.

## Event catalog (all 18)

### Server-side (emit after successful write)

| Event | Call site | Properties | Dedupe |
|---|---|---|---|
| `sign_up_completed` | `ensureProfileForClerkUser` create branch (`lib/server/profile.ts`) | — | `sign_up:{uid}` |
| `onboarding_completed` | `createItemAction`, when it is the user's first-ever item | — | `onboarding:{uid}` |
| `list_created` | `createListAction` | `template` | — |
| `item_created` | `createItemAction` | `hasPerson,hasRating,hasNote` | — |
| `person_created` | `createPersonAction` | — | — |
| `person_detail_created` | `createPersonDetailAction` | `kind` | — |
| `pocket_captured` | `createScrapAction` | — | — |
| `pocket_filed` | `fileScrapAction` | `hasPerson` | — |
| `entity_deleted` | `deleteList/Item/Person/Detail/ScrapAction` | `entity` | — |
| `operation_error` | selective existing catch points | `action,code` | — |

Notes:
- `sign_up_completed`: emit only on the true create (not the P2002 race-recovery
  return path). Dedupe key makes a double-emit harmless anyway.
- `onboarding_completed`: in `createItemAction`, after the item is created, count
  the user's items; if this is the first (count === 1), emit. Deduped.
- Properties are booleans/enums only — e.g. `hasPerson = Boolean(input.personId)`,
  `kind` = the detail/template category string (a fixed enum, never free text).

### Client-side (`trackProductEvent`)

| Event | Call site | Properties | Dedupe |
|---|---|---|---|
| `search_completed` | `components/global-search.tsx` when results settle | `kind,resultCount,zeroResult` | — |
| `return_session` | analytics-client init (see below) | — | `return:{sessionId}` |
| `list_revisited` | `app/app/(main)/list/[id]` view (client mount) | — | — |
| `person_revisited` | person page view (client mount) | — | — |
| `special_day_nudge_viewed` | `components/person-day-nudge.tsx` on show | — | `nudge:{personId}:{sessionId}` |
| `special_day_nudge_opened` | same, on click-through | — | — |
| `special_day_nudge_dismissed` | same, on dismiss | — | — |
| `feature_used` | helper; wired now to 1–2 obvious spots (e.g. list pin) | `feature` | — |

Notes:
- `search_completed`: emit `kind` (movies/books/music), `resultCount` (number),
  `zeroResult` (boolean). **Never the query string.**
- `list_revisited` / `person_revisited`: emit on client mount of the detail page.
  No dedupe — counts are views; analysis distinguishes create vs revisit by
  cross-referencing `list_created`.
- `feature_used` is the escape hatch for future adoption tracking; wire the
  helper + one real use so the pattern exists.

## `return_session` mechanics

- Add `ll:analytics-last-active` to **localStorage** (survives across sessions;
  session id stays in sessionStorage).
- On client init (analytics-client module / a small `<AnalyticsBoot />` mounted
  in the app layout): read last-active. If it exists AND `now - lastActive >
  30 * 60 * 1000`, emit `return_session` with `dedupeKey: return:{sessionId}`
  (so exactly once per session).
- Bump `ll:analytics-last-active = now` on every `trackProductEvent` call and on
  boot.
- All storage access wrapped in try/catch (private mode / disabled storage).

## Non-negotiables

- **No free-form user content, ever** — no titles, notes, names, search text.
  Enforced twice: by convention at call sites, and by the sanitizer.
- **Analytics never breaks the product** — every emit path swallows its own
  errors. Server emits are fire-and-forget after the write; the action's return
  value is unaffected.
- **Once-only events** rely on the DB `dedupeKey` unique index; P2002 is
  silently ignored, so retries/races cannot double-count.
- `operation_error`: emit at existing catch points only. A blanket
  `withTracking` wrapper over all ~30 actions is deferred (noted follow-up).

## Testing

Unit (pure, fast):
- `sanitizeAnalyticsProperties`: drops objects/arrays/functions/undefined; caps
  12 keys; caps 120-char strings; returns primitives untouched.
- `isProductEventName`: known true, unknown false.
- `recordProductEvent`: swallows a P2002; swallows a generic thrown DB error
  (mock prisma); passes through happy-path fields.

Behavioral:
- `trackProductEventAction`: unknown name → no DB call; no user → no DB call;
  valid → sanitized properties reach `recordProductEvent`.
- `sign_up_completed`: fires on profile create; does NOT fire on the P2002
  race-recovery return path.

Client emit sites (thin wrappers) verified by code review / pattern equivalence
rather than DOM tests, consistent with prior Motion/reduced-motion practice.

## Follow-ups (not this slice)

- `withTracking` wrapper for blanket `operation_error` coverage.
- Owner-gated read dashboard once events accumulate.
- The 12-interview research program.

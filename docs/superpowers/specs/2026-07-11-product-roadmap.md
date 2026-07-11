# Product Roadmap — Trust, Analytics, Organization, Capture, Reminders

Date: 2026-07-11
Status: Planning map. Each slice below becomes its own spec → plan → build cycle.
This document records the decomposition, sequencing, dependencies, and open
questions so no slice is designed in isolation or forgotten.

## Guiding principle

These five areas are **not one project**. They are five independent subsystems,
each large enough to warrant its own spec. This doc is the shared map; it is not
itself an implementation spec. We build one slice at a time, measuring with the
analytics slice before betting on the others.

## Current repo state (verified 2026-07-11)

- **Analytics scaffolding exists but is dead.** `lib/analytics.ts` (server
  recorder + 18 event names), `lib/analytics-client.ts` (session-keyed client
  tracker), the `AnalyticsEvent` table + migration
  (`20260710120000_product_analytics_and_item_pinning`), and a `pinned` column
  on `ListItem` are all in the working tree. The client imports
  `trackProductEventAction`, which **does not exist yet** — that is the missing
  link. No call sites emit events.
- **Public-profile fields are half-built.** `mapProfile`
  (`lib/server/serialize.ts:114`) hardcodes `isPublic: false` and returns empty
  `tags`/`featuredListIds`, while the DB (`prisma/schema.prisma:60`) carries
  `handle`, `bio`, featured lists, and visibility. Unfinished surface — strip or
  ship.
- **People links already shipped.** Items can link to a `personId`
  (commit `1b14fa6`); person pages gather their little ideas (`9e66214`). This
  is the substrate for "Recommended by" and person filters.
- **Pocket/Scrap model exists.** `createScrapAction` / `fileScrapAction` power
  capture-then-file — the substrate for external (PWA) capture.
- **Cascade deletes are in place.** Every relation uses `onDelete: Cascade` to
  `Profile`, so deleting one `Profile` row wipes all of a user's data — the
  substrate for verified account deletion.

## Sequencing & dependencies

```
#2 Analytics ──► instruments everything after it (build FIRST)
#1 Trust ─────► strip/ship public-profile decision unblocks #4 "Recommended by"
                and any later sharing slice
#3 Organization ► independent; largest single slice
#4 Capture (PWA) ► reuses Pocket/Scrap + People links (already built)
#5 Occasions ──► most new schema + a delivery-channel decision (own brainstorm)
```

Order of work: **#2 → #1 → #3 → #4 → #5.** Rationale: analytics is the
instrument that tells us whether #3/#4/#5 move the needle; trust/export precedes
growth; the rest are additive.

---

## Slice #2 — Product analytics (capture-only)  ·  NOW  ·  Small

**Status: designed, spec next.** Approved product definitions:
- Emission is **hybrid**: server-side emits for mutations (in `lib/actions.ts` /
  `lib/server/profile.ts`), client-side emits via `trackProductEvent` for what
  the server never sees (search, revisits, nudges, return sessions).
- New `trackProductEventAction` server action is the missing link; sanitizes
  properties (categorical/boolean/count only — never user content), resolves
  user via `getCurrentUserProfile` (drops silently if none), never throws.
- `onboarding_completed` fires on the user's **first item** (list ≥1 AND item ≥1),
  deduped `onboarding:{uid}`.
- `return_session` fires on a **new session with a >30-min gap** since last
  activity (localStorage `ll:analytics-last-active`), deduped `return:{sessionId}`.
- All 18 events mapped to real call sites (see the analytics spec).
- **Out of scope:** any read UI/dashboard (read via SQL), and the 12-interview
  research program (not code).

**Interview program (research, tracked here, not built):** ~12 interviews —
4 active list/media users, 4 Notes/gift-idea savers, 4 signed-up-never-returned.
Key question: *"Tell me about the last time you forgot a recommendation or a
small detail about someone."*

---

## Slice #1 — Trust & data ownership  ·  NOW  ·  Medium

Three independent pieces + content:

1. **Complete export** (JSON + CSV) of lists, items, people, details, scraps.
   Pure read + serialize; no schema change. Cleanest first piece.
2. **Verified account deletion.** Clerk `user.deleted` **webhook** (signature-
   verified) → delete the `Profile` row; existing cascades wipe the rest. Handle
   idempotency (webhook retries) and the already-gone case.
3. **Public-profile fate** (the deferred decision). **Recommendation: strip
   now** — remove `isPublic`/`handle`/`bio`/`featuredLists` from the active
   mental model (`serialize.ts:114`, `schema.prisma:60`), reintroduce
   intentionally with a future sharing slice. Keeps the model honest.
4. **Privacy-page copy:** retention, subprocessors (Clerk, Neon, host),
   deletion, export, security — stated precisely. Plus backup/recovery messaging.

**Open questions:** strip vs ship public profile (recommend strip); do exports
run synchronously or as a generated download; where does the Clerk webhook route
live and how is the signing secret configured.

---

## Slice #3 — Better organization inside lists  ·  NOW  ·  Medium (may split)

Table-stakes collection controls. `position` and `pinned` columns already exist.

- **Sort** by recently added, title, rating, status, custom order.
- **Manual reorder** (drag) writing to `position`.
- **Pin an item** (column exists) — pinned float to top.
- **Move / copy** an item between lists.
- **Filter** by tag and by person.
- **Duplicate a list.**
- **Duplicate-item detection** before saving (warn on near-match in the list).

**Likely sub-split:** (3a) sort + reorder + pin, then (3b) move/copy + duplicate
list + duplicate detection.

**Open questions:** does custom order coexist with other sorts (custom is a sort
mode); is duplicate detection exact-title or fuzzy; move vs copy default.

---

## Slice #4 — Capture outside the app (PWA)  ·  NEXT  ·  Medium

Most new infrastructure, but reuses the Pocket/Scrap + People substrate.

- **PWA manifest** + service worker for installability.
- **Web Share Target** — accept shared URLs/text from the OS share sheet.
- **URL enrichment** — a server route fetching OpenGraph/metadata to extract
  title, image, description, price, place. (Watch SSRF / timeouts / size caps.)
- **Capture first, file later** — reuse existing Scrap → file flow.
- **"Recommended by"** — attach a person (existing `personId`) as the
  recommender. High-value, connects collections to People without a CRM.
- Bookmarklet / browser extension: explicitly **later**, not this slice.

**Open questions:** metadata-fetch host allowlist/limits; offline scope of the
service worker; how "Recommended by" differs from the existing gift "who's it
for?" person link.

---

## Slice #5 — Occasions & reminders  ·  NEXT  ·  Medium  ·  strongest retention

The one real data-model change and the most product nuance. **Needs its own
brainstorm before spec**, because the delivery channel is undecided.

- Promote single `specialDay` → an **`Occasion`** model: type (birthday /
  anniversary / custom), date, optional label, **multiple per person**.
- **Reminder timing:** 30 days / 7 days / day-of.
- **Context in the reminder:** "You saved three gift ideas for Maya" — joins
  occasions to that person's linked items.
- **Optional gentle weekly digest.**

**Open questions (blockers for spec):**
- **Delivery channel** — transactional email? web push? in-app only? This
  decides most of the architecture and needs a decision first.
- Scheduling mechanism — cron job / scheduled function; idempotent "already
  sent" tracking so retries don't double-send.
- Migration path from existing `specialDay` data to `Occasion` rows.

---

## Explicitly avoided for now

Social feed / followers / comments (weakens private positioning); general
task/project management (turns it into a crowded productivity app); AI chat
assistant (expensive distraction before core retention is proven).

# Trust & Data Ownership

Date: 2026-07-11
Slice: Roadmap #1 (see `2026-07-11-product-roadmap.md`)
Status: Design approved (decisions locked); ready for implementation plan.

## Goal

Make Little Lists honestly private and portable: remove the half-built
public-profile surface, give users a complete export of everything they've
saved, and a verified account-deletion path that wipes their data when their
Clerk account is deleted (and lets them trigger that from inside the app).

**In scope:** strip public-profile fields, JSON+CSV export, Svix-verified
deletion webhook + in-app delete, precise privacy-page copy.
**Out of scope:** building any public sharing surface (deferred to a later
dedicated slice), read-only list links, collaboration.

## Locked decisions

- **Public profile: strip now.** No public rendering exists anywhere; the model
  will stop pretending. Drop `Profile.handle`, `Profile.bio`,
  `Profile.avatarUrl`, drop `List.visibility` + the `Visibility` enum outright.
  `List.description` stays (not public-specific). `featuredListIds`/`tags` are
  client-type-only (no DB backing) and are removed from the type.
- **Export: JSON + CSV**, via an authenticated download route (synchronous
  stream; no async job at this scale).
- **Deletion: Svix-verified webhook + in-app delete button** (typed confirm),
  belt-and-suspenders DB delete in the action so data is gone immediately.

## Current state (verified 2026-07-11)

- `Profile` has `handle`, `bio`, `avatarUrl` (all nullable, unused except
  `mapProfile` hardcoding). `mapProfile` (`lib/server/serialize.ts:114`) already
  returns `isPublic: false`, `tags: []`, `featuredListIds: []`.
- `List` has `visibility Visibility @default(private)` and `description String?`.
  No path ever sets visibility to `public`; nothing renders public.
- No webhook route exists (`app/api` has only `search/[kind]`). No `svix`,
  zip, or csv dependency installed. No `clerkClient` usage yet.
- Profile page `app/app/(main)/profile/page.tsx` is a client component using a
  `CornerRow` row pattern, `useClerk`, `openConfirm`/`showToast` — the home for
  the new Export and Delete controls.
- Every model relates to `Profile` with `onDelete: Cascade`, so deleting one
  `Profile` row wipes all of a user's data.

---

## Task A — Strip the public-profile surface

**Schema migration** (`prisma/migrations/<ts>_strip_public_profile/`):
- `ALTER TABLE "Profile" DROP COLUMN "handle", DROP COLUMN "bio", DROP COLUMN "avatarUrl";`
- `ALTER TABLE "List" DROP COLUMN "visibility";`
- `DROP TYPE "Visibility";`
- Update `schema.prisma` to match; regenerate client.

**Type + serialize:**
- `lib/types.ts` `Profile`: remove `handle`, `bio`, `isPublic`, `tags`,
  `featuredListIds`. Keep exactly the fields the app reads today — from
  `mapProfile` those are `name`, `avatarEmoji` (display default "🌙"), `theme`,
  `demoSeeded`, `checklistDismissed`. Verify against readers before removing.
- `mapProfile` (`lib/server/serialize.ts`): stop referencing removed columns and
  drop the removed type fields.
- `mapList`: drop any `visibility` reference.

**UI cleanup:** grep every reader of the removed fields
(`handle`, `bio`, `avatarUrl`, `isPublic`, `featuredListIds`, `visibility`,
`tags` on Profile) across `components/` and `app/` and remove/neutralize —
`profile-header.tsx` is the likely one. Follow existing patterns; no visual
redesign.

**Done when:** schema/types/serialize/UI carry no public-profile concept, tsc
clean, tests green, app renders unchanged (profile still shows name + theme).

---

## Task B — Export (JSON + CSV)

**`lib/export.ts`** (pure, unit-tested):
- `buildExportJson(data): ExportDocument` — a complete nested structure:
  `{ exportedAt, profile: {name, theme, ...core}, lists: [{...list, items:[...]}],
  people: [{...person, details:[...]}], scraps: [...] }`. No Clerk ids beyond the
  user's own; no analytics.
- `toCsv(rows: Record<string,unknown>[], columns: string[]): string` — RFC-4180
  escaping (quote fields containing `," \n`, double embedded quotes, CRLF rows).
- Per-entity CSV builders: `lists`, `items` (with `listTitle`), `people`,
  `details` (with `personName`, `section`), `scraps`.

**`app/api/export/route.ts`** (authed GET):
- Resolve user via `getCurrentUserProfile()`; 401 if none.
- Load all the user's rows (lists+items, people+details, scraps) scoped by
  `userId`.
- `?format=json` (default) → `application/json`,
  `Content-Disposition: attachment; filename="little-lists-export.json"`.
- `?format=csv` → build the five CSVs, zip them (add `jszip`), stream
  `application/zip`, filename `little-lists-export.zip`.
- Route excluded from any redirect logic; it's an API route, auth-gated by the
  Clerk middleware which already protects `/api/*` except public matchers.

**Profile page:** an "Export your data" section with two controls (Download
JSON / Download CSV) — anchor/link to the route with `download`, styled to match
existing rows.

**Done when:** both downloads produce correct, complete files for the signed-in
user only; `lib/export.ts` unit tests cover JSON shape + CSV escaping edge cases
(commas, quotes, newlines, unicode).

---

## Task C — Account deletion

**Dependency + env:** add `svix`. New env `CLERK_WEBHOOK_SIGNING_SECRET`
(documented; the user configures the endpoint in the Clerk dashboard and pastes
the secret). Document in a `.env.example`-style note and the plan.

**`app/api/webhooks/clerk/route.ts`** (POST, public):
- Read raw body + `svix-id`/`svix-timestamp`/`svix-signature` headers; verify
  with `new Webhook(secret).verify(body, headers)`. On failure → 400.
- On `user.deleted` (payload `data.id` = clerkUserId): `prisma.profile.deleteMany({
  where: { clerkUserId } })` (deleteMany = idempotent; already-gone is a no-op).
  Cascade wipes lists/items/people/details/scraps/analytics. Return 200.
- Any other event type → 200 (ignored). Never throw a 500 for a well-formed but
  unhandled event.

**Middleware:** make `/api/webhooks/clerk` public (Clerk can't send a session
token). Update the Clerk `middleware.ts` matcher / `isPublicRoute`.

**In-app delete** — `deleteAccountAction` (server action):
- `const { clerkUserId } = await requireUserProfile();`
- `await prisma.profile.deleteMany({ where: { clerkUserId } })` (immediate).
- `await (await clerkClient()).users.deleteUser(clerkUserId)` (fires webhook;
  idempotent DB delete already ran).
- Wrapped so a Clerk-side failure still reports cleanly.
- Profile page: "Delete my account" row (danger styling) → typed-confirm dialog
  ("type delete to confirm") → action → `signOut()` → redirect to `/`.

**Done when:** a `user.deleted` webhook with a valid signature deletes the DB
record and an invalid signature is rejected; the in-app button removes the
account and signs the user out. Tests cover signature valid/invalid,
user.deleted vs ignored event, and the action's delete-then-clerk order (mocked).

---

## Task D — Privacy page copy

Rewrite `components/landing/privacy.tsx` (and any privacy content source) to
state precisely, in the app's voice:
- **Retention:** data is kept until you delete it or your account; deletion is
  immediate and cascades to everything.
- **Subprocessors:** Clerk (authentication), Neon (database hosting), the app
  host, TMDB/OpenLibrary (media search lookups — queries are sent to fetch
  results, not stored by us beyond what you save).
- **Export:** you can download everything as JSON or CSV anytime.
- **Deletion:** delete from inside the app or via your account portal; both wipe
  your data.
- **Security:** auth via Clerk, encrypted in transit, private by default — no
  public profiles, no sharing, no ads, no selling data.
- **Backup/recovery:** honest statement of what backups exist (managed DB
  provider) and that deleted data is not recoverable.

No em dashes in user-facing copy (repo convention). Keep the existing privacy
component's structure/animation; swap the content.

**Done when:** the privacy page reads accurately against what the app actually
does after this slice (no mention of profiles/handles/sharing).

---

## Testing summary

- `lib/export.ts`: JSON shape (nested, complete, no foreign ids), CSV escaping
  (comma/quote/newline/unicode), zip contains five named CSVs.
- Webhook: valid signature + `user.deleted` → deleteMany called with the right
  clerkUserId; invalid signature → 400, no delete; unhandled event → 200, no
  delete.
- `deleteAccountAction`: deletes DB row then calls Clerk deleteUser; a Clerk
  failure doesn't leave the action throwing uncaught.
- Strip: tsc clean + full suite green proves no dangling references.

## Sequencing & external steps

Build order: **A (strip) → B (export) → C (deletion) → D (copy)**. A is the
riskiest (schema + broad type changes) so it goes first and de-risks the rest.

**External setup the user performs (documented, not automatable here):**
configure the Clerk webhook endpoint (`/api/webhooks/clerk`, subscribe to
`user.deleted`) and set `CLERK_WEBHOOK_SIGNING_SECRET` in `.env.local` and the
deployment environment.

## Out of scope / deferred

Public sharing (profiles, handles, read-only list links) — its own future
slice. Contact import. Any analytics dashboard.

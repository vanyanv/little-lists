# Little Lists — Prisma + Neon Database Foundation (Step 2) — Design

**Date:** 2026-06-28
**Status:** Approved
**Scope:** Database foundation only — Prisma ORM, Neon Postgres connection,
Prisma client singleton, schema + initial migration, and server-side helpers
for the current Clerk user. No UI rewiring except auto-creating a Profile row
when a signed-in user first reaches the app.

## Goal

Establish user-owned persistence for Little Lists: a Prisma schema mapping Clerk
users to app data (Profile, List, ListItem, Person, PersonDetail), a generated
Prisma Client, a connection to Neon Postgres, an initial migration, and the
server helpers later steps will use to read/write data scoped to the signed-in
user. The existing localStorage prototype UI is untouched and keeps working.

## Context (existing codebase)

- **Stack:** Next.js 16.2.9 (App Router, React 19), TypeScript, Tailwind v4.
  Clerk v7 (`@clerk/nextjs@^7.5.9`) already installed and gating routes via
  `proxy.ts`.
- **Repo rule (`AGENTS.md`):** this is a modified Next.js build — implementers
  MUST consult `node_modules/next/dist/docs/` before writing Next-specific code
  (here: the async server-component layout in §6).
- **State today:** React Context store in `lib/store.tsx` backed by
  `localStorage`, seeded from `lib/mock-data.ts` (`MOCK_LISTS`, `MOCK_PEOPLE`,
  `MOCK_PROFILE`). Per-browser, not per-user. **Unchanged in this step.**
- **App types today:** `lib/types.ts` defines `ThemeColor`, `ListTemplate`,
  `ViewMode`, `StatusId` (~30 template-specific statuses), and the `List` /
  `Item` / `Person` / `Profile` shapes the UI uses. The DB schema mirrors these
  conceptually but does not import them — DB enums and app unions stay
  decoupled (see Decisions B).
- **Protected layout:** `app/(app)/layout.tsx` is currently a sync server
  component rendering `ListsProvider` → `AppShell`. It is the hook point for
  profile auto-creation (§6).
- **Env:** `.env.local` (gitignored) already holds a full Neon integration
  dump, including `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct),
  plus Vercel-style aliases (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`,
  `PG*`) we do not use.

## Decisions (confirmed with user)

- **A — Ownership key = Clerk user id everywhere.** Every owned row carries
  `userId` holding the Clerk user id string (e.g. `user_2abc…`).
  `Profile.clerkUserId` is `@unique` and holds the same value. Relations link
  through `clerkUserId`, so ownership checks are a flat `where: { userId }` with
  no Profile-id lookup.
- **B — Native Postgres enums for well-bounded sets; strings for the rest.**
  Enums: `TemplateType`, `ViewMode`, `Visibility`, `PersonDetailSection`.
  `ListItem.status` stays a free-form `String?` (the app derives ~30
  template-specific statuses itself; an enum would fight that). `themeColor`
  stays `String?` (decoupled from the UI palette so palette changes need no
  migration).
- **C — Arrays + JSON.** `tags String[]` (native Postgres array) and
  `metadata Json` (template-specific info: movie year/tmdbId/overview, book
  author/isbn/description, place location/url, gift person/price, date
  mood/location, custom fields — schema-flexible, no per-template migration).

## Approach

**Prisma 7 requires a driver adapter** — `PrismaClient` throws on init if none
is provided (confirmed in Prisma 7.8's `ClientEngine`). For this Node-runtime
Next.js app on Neon we use `@prisma/adapter-pg` (node-postgres over Neon's
pooled connection) — lighter than the WebSocket-based `@prisma/adapter-neon`
and sufficient for server components / server actions. `@prisma/adapter-pg`
bundles `pg` and `@types/pg`, so no separate `pg` install is needed.
Migrations run via the Prisma CLI, which reads the datasource block (pooled
`url` + direct `directUrl`). Auth stays Clerk's job; authorization is enforced
in server code by scoping every query to the current Clerk user's `userId`
(the helpers in §5 provide that identity). This step wires only one DB write
into the UI: an idempotent Profile upsert on first app access.

## Design

### 1. Dependencies (minimal)

`npm install @prisma/client@7 @prisma/adapter-pg@7 server-only` and
`npm install -D prisma@7`. Keep `prisma`, `@prisma/client`, and
`@prisma/adapter-pg` on the same 7.x version (Prisma requires CLI, client, and
adapter versions to match).

- `prisma` — CLI / migration engine (dev).
- `@prisma/client` — generated client.
- `@prisma/adapter-pg` — required Prisma 7 driver adapter (node-postgres);
  bundles `pg` + `@types/pg`.
- `server-only` — tiny standard Next.js guard; importing DB modules from a
  client component then fails the build instead of leaking server code.

No WebSocket Neon adapter, no separate `pg` install.

### 2. Connection — `prisma/schema.prisma` + `prisma.config.ts`

Prisma 7 removed `url`/`directUrl` from the `datasource` block (they throw
`P1012`) and no longer auto-loads `.env`. The schema datasource keeps only the
provider; connection + env loading move to a root `prisma.config.ts`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

```ts
// prisma.config.ts
import { defineConfig, env } from "prisma/config";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";

dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

export default defineConfig({
  datasource: {
    // CLI/migrate connection — DIRECT (unpooled); the runtime client uses the
    // pooled DATABASE_URL via the adapter (§4). PrismaConfig.datasource is only
    // { url, shadowDatabaseUrl } in Prisma 7 — no directUrl.
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
```

Both env vars already exist in `.env.local`.

### 3. Models

All ids `String @id @default(cuid())`. All models carry
`createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.

**Profile** — maps a Clerk user to app profile data.
- `clerkUserId String @unique`
- `displayName String`
- `handle String?`, `avatarUrl String?`, `bio String?`, `themeColor String?`
- Relations: has many `List`, `ListItem`, `Person` (each via
  `clerkUserId` ← child `userId`).

**List**
- `userId String`
- `title String`, `emoji String`, `templateType TemplateType`,
  `themeColor String`, `defaultViewMode ViewMode @default(cozy)`,
  `visibility Visibility @default(private)`, `description String?`
- `user Profile @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)`
- has many `ListItem` (`onDelete: Cascade`)
- `@@index([userId])`

**ListItem**
- `listId String`, `userId String`
- `title String`, `subtitle String?`, `note String?`, `status String?`,
  `emoji String?`, `imageUrl String?`, `tags String[] @default([])`,
  `metadata Json @default("{}")`, `position Int?`
- `list List @relation(fields: [listId], references: [id], onDelete: Cascade)`
- `user Profile @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)`
- `@@index([listId])`, `@@index([userId])`

**Person**
- `userId String`
- `name String`, `emoji String`, `shortNote String?`, `themeColor String?`
- `user Profile @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)`
- has many `PersonDetail` (`onDelete: Cascade`)
- `@@index([userId])`

**PersonDetail**
- `personId String`, `userId String`
- `section PersonDetailSection`, `title String`, `note String?`,
  `tags String[] @default([])`
- `person Person @relation(fields: [personId], references: [id], onDelete: Cascade)`
- `user Profile @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)`
- `@@index([personId])`, `@@index([userId])`

**Enums**
- `TemplateType`: `movie, book, food, place, gift, date, people_notes, custom`
- `ViewMode`: `grid, list, cozy`
- `Visibility`: `private, unlisted, public`
- `PersonDetailSection`: `likes, dislikes, food, movies, books, gifts, date_ideas, notes`

`metadata Json` has no DB-level shape; documented template-specific keys
(movie: year/tmdbId/overview; book: author/isbn/description; place:
location/url; gift: person/price; date: mood/location) are an application
convention, validated in app code in later steps.

### 4. Prisma client singleton — `lib/prisma.ts`

`import "server-only"` at top. Global-cached singleton (so Next dev hot-reload
reuses one client instead of exhausting Neon connections) constructed with the
**required** `@prisma/adapter-pg` driver adapter:

```ts
import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 5. Server helpers — `lib/server/profile.ts`

`import "server-only"` at top. All use Clerk's server SDK (`@clerk/nextjs/server`).

- `ensureProfileForClerkUser(): Promise<Profile | null>` — returns `null` if no
  signed-in user; otherwise **upserts** a Profile by `clerkUserId` (on create,
  seeds `displayName` from Clerk first name → username → "friend"). Idempotent;
  safe to call on every request.
- `getCurrentUserProfile(): Promise<Profile | null>` — the current Clerk user's
  Profile, or `null` (no write).
- `requireUserProfile(): Promise<Profile>` — returns the Profile or throws if no
  signed-in user / no Profile. For future server actions and route handlers.

### 6. The one UI hook — profile auto-creation

`app/(app)/layout.tsx` becomes an **async server component** that
`await ensureProfileForClerkUser()` before rendering the existing
`ListsProvider` → `AppShell`. Runs after Clerk's `proxy.ts` gate on every
protected route. The localStorage store is not touched; lists/people still come
from mock data. Per `AGENTS.md`, the implementer checks
`node_modules/next/dist/docs/` for async-layout caveats in this Next build
before writing it.

### 7. Migration

`npx prisma migrate dev --name init` against the Neon database — creates the
tables and `prisma/migrations/`. The migration directory is committed; it runs
against the user's live Neon instance during implementation (the user supplied
the connection URLs).

## Error handling

- Missing `DATABASE_URL` / `DATABASE_URL_UNPOOLED` → Prisma's own clear startup
  error. Both already exist in `.env.local`.
- `ensureProfileForClerkUser()` with no signed-in user returns `null` (the
  `proxy.ts` gate means protected routes always have a user, but the helper is
  defensive).
- The upsert is idempotent, so a race between concurrent first requests cannot
  create duplicate Profiles (`clerkUserId` is `@unique`).

## Testing & verification

- `npx prisma validate` ✓ and `npx prisma generate` ✓ (schema valid, client
  generates).
- `npx prisma migrate dev --name init` applies cleanly to Neon; migration
  files committed.
- `npx tsc --noEmit` ✓ and `npm run build` ✓.
- App still runs exactly as today: unauthenticated `/` redirects to `/welcome`;
  signed-in app routes render the existing localStorage UI unchanged. The only
  new behavior is a silent Profile upsert on first protected-route access.
- Real credentialed verification (a signed-in request creating one Profile row)
  is confirmed by the user, since it needs a real Clerk login.

## Out of scope (explicitly not in this step)

Connecting lists / items / people UI to the database (still localStorage),
movie/book APIs, sharing, friends, comments, feed, the WebSocket-based
`@prisma/adapter-neon` (we use the lighter node-postgres `@prisma/adapter-pg`),
and any redesign of the existing app.

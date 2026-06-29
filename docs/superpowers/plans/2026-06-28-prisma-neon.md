# Prisma + Neon Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the user-owned database foundation for Little Lists — Prisma 7 schema, Neon Postgres connection via the required driver adapter, client singleton, initial migration, and Clerk-aware profile helpers — without touching the existing localStorage UI beyond a silent profile upsert on first app access.

**Architecture:** Prisma 7 schema (5 models, 4 Postgres enums) on Neon Postgres. Prisma 7 *requires* a driver adapter, so the singleton in `lib/prisma.ts` wraps `PrismaClient` with `@prisma/adapter-pg` over Neon's pooled `DATABASE_URL`; the CLI runs migrations through the datasource's pooled `url` + direct `directUrl`. Ownership is keyed on the Clerk user id (`userId` columns ← `Profile.clerkUserId @unique`). Server-only helpers (`ensureProfileForClerkUser`, `getCurrentUserProfile`, `requireUserProfile`) provide the current user's profile; the `(app)` layout calls the upsert on every protected request.

**Tech Stack:** Next.js 16.2.9 (App Router, React 19), TypeScript, Clerk v7 (`@clerk/nextjs@^7.5.9`), Prisma 7.x (`prisma`, `@prisma/client`, `@prisma/adapter-pg` — all same version), Neon Postgres, `server-only`.

## Global Constraints

- **Prisma 7 requires a driver adapter** — `new PrismaClient()` with no adapter throws `PrismaClientInitializationError` at runtime. Always construct with `new PrismaClient({ adapter })`.
- Keep `prisma`, `@prisma/client`, and `@prisma/adapter-pg` on the **same 7.x version**. `@prisma/adapter-pg` bundles `pg` + `@types/pg`; do **not** install `pg` separately.
- **Ownership key = Clerk user id everywhere.** Every owned row's `userId` holds the Clerk user id string; `Profile.clerkUserId` is `@unique` and holds the same value; relations reference `clerkUserId`.
- **Enums (exact members, lowercase/snake as written):** `TemplateType` = `movie, book, food, place, gift, date, people_notes, custom`; `ViewMode` = `grid, list, cozy`; `Visibility` = `private, unlisted, public`; `PersonDetailSection` = `likes, dislikes, food, movies, books, gifts, date_ideas, notes`. `ListItem.status` and all `themeColor` fields stay free-form `String?` — **not** enums.
- **Env vars (already in `.env.local`, gitignored):** datasource `url = env("DATABASE_URL")` (pooled), `directUrl = env("DATABASE_URL_UNPOOLED")` (direct). Never print env-var *values*; only names.
- **One UI hook only:** `app/(app)/layout.tsx` upserts the profile. No other UI is wired to the DB; the localStorage store (`lib/store.tsx`, `lib/mock-data.ts`) is untouched and the app behaves exactly as today.
- **Repo rule (`AGENTS.md`):** this is a modified Next.js build — before writing the async server-component layout (Task 5), consult `node_modules/next/dist/docs/` for async-layout / dynamic-rendering guidance in this build.
- **No new test framework.** The repo has none (`package.json` scripts are `dev`/`build`/`start`/`lint`). Verification for this DB-foundation work is `prisma validate` / `prisma generate` / `prisma migrate status` + `npx tsc --noEmit` + `npm run build`. Do **not** add jest/vitest (YAGNI) and do **not** write tests that assert nothing.
- **Do not add:** movie/book APIs, sharing, friends, comments, feed, the WebSocket `@prisma/adapter-neon`, or any redesign of the existing app.
- Path alias `@/*` → repo root (e.g. `@/lib/prisma`).

---

### Task 1: Install Prisma 7 and define the schema

**Files:**
- Modify: `package.json` (dependencies — via `npm install`)
- Create: `prisma/schema.prisma`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: Prisma models `Profile`, `List`, `ListItem`, `Person`, `PersonDetail` and enums `TemplateType`, `ViewMode`, `Visibility`, `PersonDetailSection`. Generated client (Task 2) exposes types `Profile`, `List`, etc. from `@prisma/client`, and `prisma.profile`, `prisma.list`, `prisma.listItem`, `prisma.person`, `prisma.personDetail` model delegates.

- [ ] **Step 1: Install dependencies**

```bash
npm install @prisma/client@7 @prisma/adapter-pg@7 server-only
npm install -D prisma@7
```

Expected: installs succeed; `package.json` lists `@prisma/client`, `@prisma/adapter-pg`, `server-only` under dependencies and `prisma` under devDependencies, all `@prisma/*` on the same 7.x version. Confirm:

```bash
npm ls prisma @prisma/client @prisma/adapter-pg
```
Expected: the three resolve to matching `7.x.y` versions (no `UNMET`/version-mismatch warnings).

- [ ] **Step 2: Write the schema**

Create `prisma/schema.prisma` with exactly this content:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}

enum TemplateType {
  movie
  book
  food
  place
  gift
  date
  people_notes
  custom
}

enum ViewMode {
  grid
  list
  cozy
}

enum Visibility {
  private
  unlisted
  public
}

enum PersonDetailSection {
  likes
  dislikes
  food
  movies
  books
  gifts
  date_ideas
  notes
}

model Profile {
  id          String   @id @default(cuid())
  clerkUserId String   @unique
  displayName String
  handle      String?
  avatarUrl   String?
  bio         String?
  themeColor  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  lists         List[]
  items         ListItem[]
  people        Person[]
  personDetails PersonDetail[]
}

model List {
  id              String       @id @default(cuid())
  userId          String
  title           String
  emoji           String
  templateType    TemplateType
  themeColor      String
  defaultViewMode ViewMode     @default(cozy)
  visibility      Visibility   @default(private)
  description     String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  user  Profile    @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)
  items ListItem[]

  @@index([userId])
}

model ListItem {
  id        String   @id @default(cuid())
  listId    String
  userId    String
  title     String
  subtitle  String?
  note      String?
  status    String?
  emoji     String?
  imageUrl  String?
  tags      String[] @default([])
  metadata  Json     @default("{}")
  position  Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  list List    @relation(fields: [listId], references: [id], onDelete: Cascade)
  user Profile @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)

  @@index([listId])
  @@index([userId])
}

model Person {
  id         String   @id @default(cuid())
  userId     String
  name       String
  emoji      String
  shortNote  String?
  themeColor String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user    Profile        @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)
  details PersonDetail[]

  @@index([userId])
}

model PersonDetail {
  id        String              @id @default(cuid())
  personId  String
  userId    String
  section   PersonDetailSection
  title     String
  note      String?
  tags      String[]            @default([])
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  person Person  @relation(fields: [personId], references: [id], onDelete: Cascade)
  user   Profile @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)

  @@index([personId])
  @@index([userId])
}
```

- [ ] **Step 3: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

(If it reports the relation-reference error "referenced field clerkUserId is not unique", confirm `Profile.clerkUserId` has `@unique`. If it cannot read env vars, confirm `.env.local` contains `DATABASE_URL` and `DATABASE_URL_UNPOOLED` — names only, never echo values.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma
git commit -m "Add Prisma 7 schema and Neon datasource for Little Lists"
```

---

### Task 2: Prisma client singleton + generate client

**Files:**
- Create: `lib/prisma.ts`
- Modify: `package.json` (add `postinstall` script)

**Interfaces:**
- Consumes: the schema from Task 1; `@prisma/client` and `@prisma/adapter-pg`.
- Produces: `export const prisma` (a `PrismaClient` instance) from `@/lib/prisma`, used by Task 4 helpers.

- [ ] **Step 1: Generate the Prisma client**

Run: `npx prisma generate`
Expected: `Generated Prisma Client (v7.x.y) ...` and the `@prisma/client` types now reflect the models. (This step is what makes `import { PrismaClient, Profile } from "@prisma/client"` type-check.)

- [ ] **Step 2: Add a postinstall generate hook**

In `package.json`, add to `"scripts"`:

```json
"postinstall": "prisma generate"
```

So the client is regenerated after every install (CI/deploys). Keep existing scripts unchanged.

- [ ] **Step 3: Write the singleton**

Create `lib/prisma.ts` with exactly this content:

```ts
import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter — node-postgres over Neon's pooled URL.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reuse one client across Next dev hot-reloads so we don't exhaust Neon's
// connection limit by constructing a new client on every module reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (no output). Confirms `@/lib/prisma` resolves, `@prisma/client` types are generated, and `@prisma/adapter-pg` types line up.

- [ ] **Step 5: Commit**

```bash
git add lib/prisma.ts package.json
git commit -m "Add Prisma client singleton with required pg driver adapter"
```

---

### Task 3: Initial migration against Neon

**Files:**
- Create: `prisma/migrations/<timestamp>_init/migration.sql` (generated)
- Create: `prisma/migrations/migration_lock.toml` (generated)

**Interfaces:**
- Consumes: validated schema (Task 1), `DATABASE_URL` + `DATABASE_URL_UNPOOLED` in `.env.local`.
- Produces: the five tables + four enum types in Neon, and committed migration history.

**Context:** Neon is reachable via the URLs already in `.env.local`. `migrate dev` uses `directUrl` (`DATABASE_URL_UNPOOLED`) and needs a shadow database; on Neon the connection-string role can create the shadow DB, so the primary command normally works. The Step-2 contingency handles the one known failure mode precisely.

- [ ] **Step 1: Create and apply the migration**

Run: `npx prisma migrate dev --name init`
Expected: Prisma creates `prisma/migrations/<timestamp>_init/migration.sql`, applies it, and prints `Your database is now in sync with your schema.` followed by `✔ Generated Prisma Client`. It should **not** prompt (empty database, explicit `--name`).

- [ ] **Step 2: (Only if Step 1 fails with shadow-database error P3014)**

If — and only if — Step 1 fails with `Error: P3014` (Prisma could not create the shadow database, a Neon permissions case), generate the SQL without a shadow DB and apply it via deploy:

```bash
mkdir -p prisma/migrations/0_init
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
printf 'provider = "postgresql"\n' > prisma/migrations/migration_lock.toml
npx prisma migrate deploy
```

Expected: `migration.sql` contains `CREATE TABLE`/`CREATE TYPE` statements for all five models and four enums; `migrate deploy` prints `Applying migration 0_init` then `All migrations have been successfully applied.`

- [ ] **Step 3: Verify the database is in sync**

Run: `npx prisma migrate status`
Expected: `Database schema is up to date!` (no pending migrations, no drift).

- [ ] **Step 4: Commit the migration**

```bash
git add prisma/migrations
git commit -m "Add initial Prisma migration for Little Lists schema"
```

---

### Task 4: Clerk-aware profile helpers

**Files:**
- Create: `lib/server/profile.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`; `auth`, `currentUser` from `@clerk/nextjs/server`; `Profile` type from `@prisma/client`.
- Produces:
  - `ensureProfileForClerkUser(): Promise<Profile | null>` — used by Task 5.
  - `getCurrentUserProfile(): Promise<Profile | null>`.
  - `requireUserProfile(): Promise<Profile>` (throws if no signed-in user / no profile) — for future server actions and route handlers.

- [ ] **Step 1: Write the helpers**

Create `lib/server/profile.ts` with exactly this content:

```ts
import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Idempotently ensure a Profile row exists for the signed-in Clerk user.
 * Returns null when there is no signed-in user. Safe to call on every request:
 * it reads first, and only writes (via upsert, which is race-safe because
 * clerkUserId is unique) when the profile is missing.
 */
export async function ensureProfileForClerkUser(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.profile.findUnique({
    where: { clerkUserId: userId },
  });
  if (existing) return existing;

  const user = await currentUser();
  const displayName =
    user?.firstName?.trim() || user?.username?.trim() || "friend";

  return prisma.profile.upsert({
    where: { clerkUserId: userId },
    update: {},
    create: { clerkUserId: userId, displayName },
  });
}

/** The current Clerk user's Profile, or null. Never writes. */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.profile.findUnique({ where: { clerkUserId: userId } });
}

/**
 * The current user's Profile, or throw. For server actions / route handlers
 * that must have an owning profile. The (app) layout's ensure call means the
 * profile already exists for any request rendered under it.
 */
export async function requireUserProfile(): Promise<Profile> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("requireUserProfile: no authenticated user profile found");
  }
  return profile;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. Confirms the Clerk server imports, the generated `Profile` type, and the `prisma.profile` delegate all resolve.

- [ ] **Step 3: Commit**

```bash
git add lib/server/profile.ts
git commit -m "Add server-only Clerk profile helpers (ensure/get/require)"
```

---

### Task 5: Auto-create the profile on app access

**Files:**
- Modify: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `ensureProfileForClerkUser` from `@/lib/server/profile`.
- Produces: no new exports; the protected layout now ensures a profile before rendering.

- [ ] **Step 1: Check the Next build's async-layout guidance**

Per `AGENTS.md`, before editing, skim the relevant doc in `node_modules/next/dist/docs/` for async server-component layouts / dynamic rendering in this Next build (e.g. search for "async" + "layout" / "dynamic"). Confirm an `async` default-exported layout that awaits a server function is supported. Note anything that would change the edit (it should not — `auth()` already makes `(app)` routes dynamic).

- [ ] **Step 2: Make the layout async and ensure the profile**

Replace the entire contents of `app/(app)/layout.tsx` with:

```tsx
import type { ReactNode } from "react";
import { ListsProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { ensureProfileForClerkUser } from "@/lib/server/profile";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // First protected-route access for a signed-in user creates their Profile.
  // Idempotent; localStorage UI below is unchanged.
  await ensureProfileForClerkUser();

  return (
    <ListsProvider>
      <AppShell>{children}</AppShell>
    </ListsProvider>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds. The `(app)` routes are dynamic (Clerk `auth()` + the profile ensure); `(auth)` routes still render. No new build errors versus before this branch. (Pre-existing `react-hooks/set-state-in-effect` lint warnings in `lib/store.tsx` / `components/add-item-modal.tsx` / the list page are unrelated to this branch and do not fail the build — leave them.)

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/layout.tsx"
git commit -m "Auto-create profile on first protected-route access"
```

---

## Self-Review

**Spec coverage:**
- Prisma setup, Neon connection, client singleton, env vars, schema, initial migration, current-user helpers → Tasks 1–5. ✓
- Models Profile/List/ListItem/Person/PersonDetail with all spec fields, enums, relationships, indexes, cascades → Task 1. ✓ (`tags String[] @default([])`, `metadata Json @default("{}")` per spec.)
- Helpers `getCurrentUserProfile` / `requireUserProfile` / `ensureProfileForClerkUser` → Task 4. ✓
- Auto-create profile on first signed-in app access → Task 5. ✓
- Prisma generates, migrations ready, app still runs, localStorage UI not broken → Tasks 2/3/5 verification. ✓
- Excludes movie/book APIs, sharing, friends, comments, feed, adapter-neon → honored throughout. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete content; every run step has an exact command + expected output. The Task 3 Step 2 contingency is a concrete, named-error branch with exact commands — not a vague "handle errors." ✓

**Type consistency:** `ensureProfileForClerkUser`/`getCurrentUserProfile`/`requireUserProfile` names and signatures match between Task 4 (definition), the interfaces blocks, and Task 5 (usage). Relations reference `Profile.clerkUserId` consistently with the `userId` columns. Enum members match the Global Constraints verbatim. ✓

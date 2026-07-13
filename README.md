# Little Lists

A warm, private, mobile-first home for the little lists that make up a life — movies to watch, books to read, gifts to give, restaurants to try — plus a People layer that remembers who recommended what and whose special day is coming up. Private by default: no feeds, no sharing, no social anything.

Built with Next.js 16 (App Router) · React 19 · Prisma 7 + Postgres (Neon) · Clerk · Tailwind v4 · motion.

## Getting started

```bash
npm install            # runs `prisma generate` via postinstall
npm run dev            # http://localhost:3000
```

You'll need a `.env.local` (see the env table below). Sign-up flows through Clerk; new accounts land in onboarding.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection (Neon) — what the app reads |
| `DATABASE_URL_UNPOOLED` | Direct (unpooled) connection — use for migrations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk auth keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `..._FALLBACK_REDIRECT_URL` | Clerk routing (`/sign-in`, `/sign-up`, `/app`) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Svix secret for the `user.deleted` webhook (`app/api/webhooks/clerk`). **Required in production** — without it, deleting a Clerk account does not delete the user's data, and the `/privacy` deletion promise is false. Configure the endpoint in the Clerk dashboard (subscribe to `user.deleted`). |
| `TMDB_API_READ_ACCESS_TOKEN` | Movie search (TMDB). Book search (Open Library) and music search (iTunes) need no keys. |

The `POSTGRES_*` / `PG*` variables are the Vercel↔Neon integration's aliases of the same database; Prisma reads `DATABASE_URL`.

## Commands

```bash
npm run dev          # dev server
npm run lint         # eslint — keep at 0 errors, 0 warnings
npm test             # vitest unit suite
npm run build        # production build — see note below
npm run screenshots  # scripted Playwright screenshots
```

### `npm run build` is a real gate

Lint, tsc, and the unit tests can all stay green while a React-Server-Component boundary break (e.g. a client hook imported from a server component) 500s every page. Only `next build` catches it. Run it before merging. Related: `lib/a11y.ts` must stay server-safe (constants only — marketing RSC pages import it); client hooks live in their own `"use client"` files.

## Database & migrations

`prisma migrate dev` **fails in non-interactive shells** (it wants a TTY). The working flow for schema changes:

1. Edit `prisma/schema.prisma`.
2. Hand-author the migration folder: `prisma/migrations/<timestamp>_<name>/migration.sql`.
3. `npx prisma migrate deploy` (against `DATABASE_URL_UNPOOLED`).
4. `npx prisma generate`, and clear `.next/types` if types look stale.

If styles or the Prisma client look stale in dev, kill the old `next dev` (it holds the old client in memory) and `rm -rf .next`.

## Deployment (Vercel + Neon)

The project is linked to Vercel. Production needs: the env table above (pooled `DATABASE_URL`, Clerk **production-instance** keys, `CLERK_WEBHOOK_SIGNING_SECRET`), and `npx prisma migrate deploy` run against the production DB per release (manual for now — deliberately not wired into the build script). Post-deploy smoke: sign up fresh, create a list, media search returns covers, pocket capture + detection, `/api/export?format=json|csv`, delete the account via the Clerk portal and confirm the `Profile` row is gone from the DB.

## Analytics

Capture-only product analytics live in the `AnalyticsEvent` table (`lib/analytics.ts`, 18 named events; categorical properties only — never free-form content). There is no dashboard; read with SQL. The dev DB contains QA noise from internal test accounts (e.g. usernames `slicefix1`, `capturefirst_qa`) — exclude those `userId`s when reading anything as signal.

## Where things live

| Path | What |
| --- | --- |
| `lib/types.ts` | Templates (`TEMPLATE_META`), item types, statuses |
| `lib/actions.ts` | All server actions |
| `lib/store.tsx` | Client store (optimistic mutations, deferred/undoable deletes, stable-identity actions — see `lib/store.test.ts` for the invariants) |
| `lib/search/` | Media search providers (TMDB / Open Library / iTunes) + local global search |
| `components/app-shell.tsx` | Shell: bottom nav, lazy bottom sheets, toasts |
| `proxy.ts` | Middleware (Clerk) — this repo's `middleware.ts` |
| `docs/superpowers/specs/` | Design specs for shipped features |
| `AGENTS.md` | Read first if you're an AI agent: this Next.js version has breaking changes — check `node_modules/next/dist/docs/` |

# Little Lists — Clerk Authentication (Step 1) — Design

**Date:** 2026-06-28
**Status:** Approved
**Scope:** Add Clerk authentication only. No database, no Prisma, no Neon, no
persistence beyond the existing localStorage prototype. No redesign of the
existing app.

## Goal

Turn Little Lists from an open local-state prototype into an authenticated app.
Unauthenticated visitors see a branded welcome / auth experience; authenticated
users see the existing app exactly as it works today. The auth screens must feel
designed *for* Little Lists — the Soft Collectible Scrapbook design language —
not dropped in from an auth provider.

## Context (existing codebase)

- **Stack:** Next.js 16.2.9 (App Router, React 19), Tailwind v4 (design tokens
  via `@theme` in `app/globals.css`, no config file), TypeScript.
- **Design tokens:** warm neutrals (`cream`, `cream-deep`, `paper`, `ink`,
  `ink-soft`, `brown`, `brown-soft`, `line`) + pastels (`blush`, `butter`,
  `sage`, `sky`, `lavender`, `clay`); pillowy radii (`md`→`2xl`, `pill`); soft
  shadows (`soft`, `lift`, `sheet`); Fraunces (`--font-display`) + Nunito
  (`--font-body`).
- **State:** React Context store in `lib/store.tsx`, backed by `localStorage`
  (`little-lists:v1`), seeded from `lib/mock-data.ts`. Per-browser, not per-user.
  Unchanged in this step.
- **Shell:** `app/layout.tsx` currently wraps **every** route in
  `ListsProvider` → `AppShell` (bottom nav, floating add button, sheets).
- **Routes today:** `/`, `/profile`, `/people`, `/person/[id]`, `/list/[id]`.
- **Reusable components to lean on:** `components/soft-dot-loader.tsx`,
  `components/sticker.tsx`, `components/sparkle-burst.tsx`,
  `components/profile-header.tsx`.

### Platform note (important)
Next.js 16 **renamed `middleware.ts` → `proxy.ts`** (same functionality). Clerk
already supports this: their docs show `clerkMiddleware()` exported from
`proxy.ts`. We use `proxy.ts` at the project root.

## Decisions (confirmed with user)

- Clerk keys already exist in `.env.local`
  (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
- Sign-out control lives on the **Profile** page.
- The signed-in user's real first name feeds the home greeting and profile
  header, falling back to the mock profile name.

## Approach

Use **Next.js route groups** to split the app into a protected app shell and a
clean auth shell. Rejected alternatives: conditionally rendering `<AppShell>`
by auth state (chrome flicker, one layout doing two jobs) and a second
top-level layout (App Router permits only one root). Route groups change
*layout* without changing URLs — the idiomatic fit.

## Design

### 1. Route structure

```
app/
  layout.tsx                 root: <html>, fonts, <ClerkProvider appearance>  (NO app chrome)
  globals.css                unchanged
  (app)/                     protected — keeps the existing chrome
    layout.tsx               ListsProvider -> AppShell   (moved out of root)
    page.tsx                 home (moved, minimal greeting edit)
    profile/page.tsx         (moved; gains sign-out control)
    people/page.tsx          (moved, untouched)
    person/[id]/page.tsx     (moved, untouched)
    list/[id]/page.tsx       (moved, untouched)
  (auth)/                    public — clean centered shell
    layout.tsx               cream bg + decorative blobs/sparkles, centered slot
    welcome/page.tsx
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
```

Route groups do not affect URLs, so `/`, `/welcome`, `/sign-in`, `/sign-up`
resolve as specified. App routes move into `(app)/` with no code changes (aside
from the two small identity/sign-out edits below) and keep working with
localStorage.

### 2. Auth gating — `proxy.ts`

`clerkMiddleware` with `createRouteMatcher`, implementing the spec's redirects:

- Public routes: `/welcome`, `/sign-in(.*)`, `/sign-up(.*)`.
- Signed-**out** user on any non-public route → redirect to `/welcome`.
- Signed-**in** user on `/welcome`, `/sign-in`, `/sign-up` → redirect to `/`.

Uses the standard Clerk `config.matcher` (skips `_next` and static assets,
always runs for api / `__clerk`).

### 3. `lib/clerkAppearance.ts` (single shared config)

A typed Clerk `Appearance` object reused by `<ClerkProvider>` and both forms.

- `variables`: `colorBackground` cream `#FFF8EF`, `colorText` ink `#2B2523`,
  `colorTextSecondary` soft-brown `#8A6F61`, `colorPrimary` soft-brown
  `#8A6F61` (legible against the white button label), cream input fields,
  warm `colorDanger`, rounded `borderRadius`, Nunito font family.
- `elements` (Tailwind classes): `card` → ~28px radius on `bg-paper` with
  `shadow-lift`; `formButtonPrimary` and `socialButtonsBlockButton` → `rounded-pill`,
  warm/soft; `formFieldInput` → soft rounded cream field; `headerTitle`/
  `headerSubtitle` use the display font and ink; warm, integrated error text;
  no harsh blue/black anywhere.

### 4. Auth pages

- **`(auth)/layout.tsx`** — centered, cream background, with a tasteful
  `AuthDecor` element: 2–3 blurred pastel blobs (blush / sky / lavender), a
  couple of sparkle SVGs, and 1–2 sticker-style emoji badges (reusing
  `Sticker` / `SparkleBurst`). Tasteful, not childish. The card slot is wrapped
  so Clerk's `<ClerkLoading>` shows the branded `SoftDotLoader` (build item #4,
  the auth loading/checking state) and `<ClerkLoaded>` reveals the content.
- **`/welcome`** — custom page (client, motion entrance).
  - Title: "Start your little world"
  - Subtitle: "Make cute little lists for everything you love, hate, and want to remember."
  - Primary CTA: "Create my Little Lists" → `/sign-up`
  - Secondary CTA: "I already have an account" → `/sign-in`
- **`/sign-up`** — custom title "Let's make your first little world" / subtitle
  "Your tiny archive starts here." above a wrapped `<SignUp />`.
- **`/sign-in`** — custom title "Welcome back to your little worlds" / subtitle
  "Your tiny archive missed you." above a wrapped `<SignIn />`.

`<SignIn />` / `<SignUp />` use Clerk path routing via the `[[...sign-in]]` /
`[[...sign-up]]` catch-all segments and the shared appearance config.

### 5. Identity wiring

Home greeting (`app/(app)/page.tsx`) and `components/profile-header.tsx` read
Clerk `useUser()` → `user?.firstName ?? profile.name`. Non-destructive; mock
profile remains the fallback.

### 6. Sign-out

A Little-Lists-styled pill on `/profile` wrapping Clerk's `<SignOutButton>` (or
`UserButton` styled via appearance) — not default Clerk chrome.

### 7. Root layout changes

`app/layout.tsx` keeps `<html>`, fonts, `<head>` emoji fallback link,
`metadata`, `viewport`. It wraps `{children}` in `<ClerkProvider appearance={clerkAppearance}>`.
`ListsProvider` + `AppShell` move to `app/(app)/layout.tsx`.

### 8. Environment

Keys already present. Add routing vars to `.env.local`:

```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### 9. Dependency

`npm install @clerk/nextjs` (latest; supports Next 16 + React 19).

## Error handling

- Clerk form/validation errors render inline via the appearance config (warm
  styling), integrated into the card.
- Missing/invalid env keys surface as Clerk's own boot error; the `SoftDotLoader`
  covers the normal initialization window.
- `proxy.ts` redirects are deterministic; no auth state means `/welcome`.

## Testing & verification

- `npm run build` and `npm run lint` pass.
- Dev server: unauthenticated `/` redirects to `/welcome`; `/welcome`,
  `/sign-in`, `/sign-up` render with Little Lists styling and the branded
  loader.
- Real credentialed sign-in/sign-up is verified manually by the user (Clerk
  requires real authentication); after sign-in the existing app renders and the
  greeting shows the real first name.

## Out of scope (explicitly not in this step)

Prisma, Neon, real database persistence, movie/book APIs, sharing, friends,
comments, feed, and any redesign of the existing app.

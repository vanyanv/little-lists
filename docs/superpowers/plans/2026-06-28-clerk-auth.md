# Little Lists — Clerk Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the Little Lists prototype behind Clerk authentication with branded welcome / sign-in / sign-up screens, leaving the existing localStorage app otherwise untouched.

**Architecture:** Split routes into a protected `(app)` route group (keeps the existing `ListsProvider` → `AppShell` chrome) and a public `(auth)` route group (clean centered shell). `ClerkProvider` moves to the root layout; a Next.js 16 `proxy.ts` (renamed middleware) redirects signed-out users to `/welcome` and signed-in users away from auth pages. Clerk's prebuilt `<SignIn />` / `<SignUp />` are skinned via one shared `appearance` config so they read as Little Lists.

**Tech Stack:** Next.js 16.2.9 (App Router, React 19), Tailwind v4 (`@theme` tokens in `app/globals.css`), TypeScript, `@clerk/nextjs`.

## Global Constraints

- **No persistence work:** no Prisma, no Neon, no database, no APIs, no sharing/friends/comments/feed. Auth only.
- **No redesign:** existing app screens and components are not restyled. App route files move into `(app)/` unchanged except the two explicit identity/sign-out edits in Task 8.
- **Design language (verbatim palette):** Cream `#FFF8EF`, Soft blush `#F7D6D0`, Butter `#F6E7A6`, Sage `#C9DCC4`, Sky `#C7DDF5`, Lavender `#D8C7F5`, Ink `#2B2523`, Soft brown `#8A6F61`. Use existing Tailwind tokens (`cream`, `paper`, `ink`, `ink-soft`, `brown`, `brown-soft`, `line`, `blush`, `butter`, `sage`, `sky`, `lavender`, `clay`) and radii (`rounded-pill`, `rounded-2xl`, `rounded-3xl`) where possible. Cards 24–32px radius; pill buttons; soft inputs; no harsh blue/black.
- **Exact copy (do not paraphrase):**
  - Welcome title: `Start your little world`
  - Welcome subtitle: `Make cute little lists for everything you love, hate, and want to remember.`
  - Welcome primary CTA: `Create my Little Lists` → `/sign-up`
  - Welcome secondary CTA: `I already have an account` → `/sign-in`
  - Sign-up title: `Let's make your first little world` / subtitle: `Your tiny archive starts here.`
  - Sign-in title: `Welcome back to your little worlds` / subtitle: `Your tiny archive missed you.`
- **Platform:** Next.js 16 uses `proxy.ts` (NOT `middleware.ts`) at project root. Clerk supports this.
- **Imports use the `@/` path alias** (e.g. `@/components/...`, `@/lib/...`), so moving route files between folders does not break imports.
- **Testing reality:** the repo has no test runner, and the deliverables are config + Clerk UI + route wiring with no pure logic worth a unit harness. Adding a test framework is out of scope (YAGNI). Verification is via `npm run build`, `npm run lint`, and runtime checks against the dev server (HTTP redirect codes + rendered pages). Real credentialed sign-in is verified manually by the user.

## File Structure

- Create `lib/clerkAppearance.ts` — shared Clerk `Appearance` config.
- Create `proxy.ts` — Clerk auth gating + redirects.
- Modify `app/layout.tsx` — root layout: keep `<html>`/fonts/metadata, add `<ClerkProvider>`, remove app chrome.
- Create `app/(app)/layout.tsx` — `ListsProvider` → `AppShell`.
- Move `app/page.tsx` → `app/(app)/page.tsx` (+ greeting edit), and `profile/`, `people/`, `person/[id]/`, `list/[id]/` into `app/(app)/`.
- Create `app/(auth)/layout.tsx` — centered cream shell.
- Create `components/auth-decor.tsx` — pastel blobs + sparkle/sticker badges.
- Create `app/(auth)/welcome/page.tsx`, `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`.
- Modify `components/profile-header.tsx` (real first name) and `app/(app)/profile/page.tsx` (sign-out button).
- Modify `.env.local` — add Clerk routing vars.

---

### Task 1: Install Clerk and add env routing vars

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.local`

**Interfaces:**
- Produces: `@clerk/nextjs` available for import; routing env vars present.

- [ ] **Step 1: Install the dependency**

Run from `/home/vardan/little-lists`:
```bash
npm install @clerk/nextjs
```
Expected: `@clerk/nextjs` (and `@clerk/types`) added to `dependencies`, install completes with no peer-dependency errors against Next 16 / React 19.

- [ ] **Step 2: Confirm the keys already present**

Run:
```bash
grep -o '^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\|^CLERK_SECRET_KEY' .env.local
```
Expected: both names printed. (Do NOT print the values.)

- [ ] **Step 3: Append the routing vars to `.env.local`**

Add these four lines to `.env.local` (leave the existing key lines untouched):
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add @clerk/nextjs dependency"
```
(`.env.local` is gitignored — do not commit it.)

---

### Task 2: Shared Clerk appearance config

**Files:**
- Create: `lib/clerkAppearance.ts`

**Interfaces:**
- Produces: `export const clerkAppearance: Appearance` — consumed by the root `ClerkProvider` (Task 4) and the sign-in/sign-up pages (Task 7).

- [ ] **Step 1: Write `lib/clerkAppearance.ts`**

```ts
import type { Appearance } from "@clerk/types";

/* One Little Lists skin for every Clerk surface. Warm cream card, ink text,
   soft-brown accents, pill buttons, soft rounded inputs — no harsh blue/black. */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#8A6F61", // soft brown — accents, links, focus
    colorText: "#2B2523", // ink
    colorTextSecondary: "#8A6F61",
    colorBackground: "#FFF8EF", // cream
    colorInputBackground: "#FFFDF9",
    colorInputText: "#2B2523",
    colorDanger: "#C56A6A",
    borderRadius: "0.9rem",
    fontFamily: "var(--font-nunito), ui-rounded, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-nunito), ui-rounded, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "rounded-[28px] bg-paper shadow-lift ring-1 ring-line/60 px-7 py-8",
    headerTitle: "font-display text-ink",
    headerSubtitle: "text-brown",
    socialButtonsBlockButton:
      "rounded-pill border border-line bg-paper text-ink hover:bg-cream-deep transition-colors",
    socialButtonsBlockButtonText: "font-semibold text-ink",
    dividerLine: "bg-line",
    dividerText: "text-brown-soft",
    formFieldLabel: "text-ink font-semibold",
    formFieldInput:
      "rounded-2xl border border-line bg-[#FFFDF9] text-ink placeholder:text-brown-soft focus:border-brown-soft focus:ring-2 focus:ring-blush/50",
    formButtonPrimary:
      "rounded-pill bg-ink text-cream font-bold normal-case hover:bg-ink-soft shadow-soft",
    footerActionText: "text-brown",
    footerActionLink: "text-brown font-bold hover:text-ink",
    formFieldErrorText: "text-[#C56A6A]",
    alert: "rounded-2xl bg-blush/30 text-ink ring-1 ring-blush/50",
    formResendCodeLink: "text-brown font-semibold",
    identityPreviewEditButton: "text-brown",
  },
};
```

- [ ] **Step 2: Type-check it compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors referencing `lib/clerkAppearance.ts`. (Other files may not yet reference it — that's fine.)

- [ ] **Step 3: Commit**

```bash
git add lib/clerkAppearance.ts
git commit -m "Add shared Little Lists appearance config for Clerk"
```

---

### Task 3: Move app routes into the `(app)` group

**Files:**
- Move: `app/page.tsx`, `app/profile/`, `app/people/`, `app/person/`, `app/list/` → under `app/(app)/`

**Interfaces:**
- Consumes: nothing new.
- Produces: app routes live in `(app)/`; URLs unchanged (`/`, `/profile`, `/people`, `/person/[id]`, `/list/[id]`).

- [ ] **Step 1: Create the group folder and move the route files with git**

Run from project root:
```bash
mkdir -p "app/(app)"
git mv app/page.tsx "app/(app)/page.tsx"
git mv app/profile "app/(app)/profile"
git mv app/people "app/(app)/people"
git mv app/person "app/(app)/person"
git mv app/list "app/(app)/list"
```

- [ ] **Step 2: Verify the move**

Run:
```bash
ls "app/(app)" && ls app
```
Expected: `(app)` contains `page.tsx profile people person list`; `app` still has `layout.tsx globals.css favicon.ico` and the new `(app)` folder. `app/page.tsx` no longer exists at top level.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Move app routes into (app) route group"
```

---

### Task 4: Root layout with ClerkProvider + `(app)` layout with chrome

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `clerkAppearance` (Task 2); `ListsProvider` from `@/lib/store`; `AppShell` from `@/components/app-shell`.
- Produces: `ClerkProvider` wraps the whole tree; app chrome only renders for `(app)` routes.

- [ ] **Step 1: Replace `app/layout.tsx` with the Clerk-wrapped root (chrome removed)**

```tsx
import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { clerkAppearance } from "@/lib/clerkAppearance";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Little Lists · your little world",
  description: "Beautiful lists for your taste, plans, and people.",
};

export const viewport: Viewport = {
  themeColor: "#FFF8EF",
  width: "device-width",
  initialScale: 1,
  // pinch-zoom stays enabled for accessibility (WCAG 1.4.4)
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${fraunces.variable} ${nunito.variable} h-full`}
      >
        <head>
          {/* color-emoji fallback for platforms without a native emoji font */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
          />
        </head>
        <body className="min-h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Create `app/(app)/layout.tsx` with the app chrome**

```tsx
import type { ReactNode } from "react";
import { ListsProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ListsProvider>
      <AppShell>{children}</AppShell>
    </ListsProvider>
  );
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/layout.tsx" "app/(app)/layout.tsx"
git commit -m "Wrap app in ClerkProvider; move chrome into (app) layout"
```

---

### Task 5: Auth gating in `proxy.ts`

**Files:**
- Create: `proxy.ts` (project root)

**Interfaces:**
- Consumes: nothing.
- Produces: signed-out users on non-public routes → `/welcome`; signed-in users on public routes → `/`.

- [ ] **Step 1: Write `proxy.ts`**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// /welcome, /sign-in, /sign-up are the only routes a signed-out visitor may see.
const isPublicRoute = createRouteMatcher([
  "/welcome",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const onPublic = isPublicRoute(req);

  // Signed-in users never see the welcome/auth screens.
  if (userId && onPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Signed-out users are sent to the welcome screen.
  if (!userId && !onPublic) {
    return NextResponse.redirect(new URL("/welcome", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "Gate routes with Clerk proxy: signed-out to /welcome"
```

(Runtime redirect behavior is verified end-to-end in Task 9.)

---

### Task 6: Auth shell layout + decorative elements

**Files:**
- Create: `components/auth-decor.tsx`
- Create: `app/(auth)/layout.tsx`

**Interfaces:**
- Consumes: `Sticker` from `@/components/sticker` (names available: `sparkle`, `star`, `heart`, `flower`, `leaf`, `book`, `film`, `tape`).
- Produces: `AuthDecor` component; centered cream auth shell wrapping `(auth)` pages.

- [ ] **Step 1: Write `components/auth-decor.tsx`**

```tsx
import { Sticker } from "@/components/sticker";

/* Tasteful Little Lists framing for the auth card: soft pastel blobs plus a
   couple of sparkle/sticker badges. Decorative only — aria-hidden. */
export function AuthDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -left-16 -top-10 h-56 w-56 rounded-full bg-blush/40 blur-3xl" />
      <div className="absolute -right-20 top-24 h-64 w-64 rounded-full bg-sky/40 blur-3xl" />
      <div className="absolute bottom-[-4rem] left-1/4 h-60 w-60 rounded-full bg-lavender/35 blur-3xl" />
      <Sticker name="sparkle" size={34} rotate={-8} className="absolute left-8 top-16 opacity-70" />
      <Sticker name="star" size={26} rotate={12} className="absolute right-10 top-12 opacity-60" />
      <Sticker name="heart" size={22} className="absolute bottom-16 right-12 opacity-60" />
      <Sticker name="flower" size={30} rotate={-14} className="absolute bottom-20 left-9 opacity-55" />
    </div>
  );
}
```

- [ ] **Step 2: Write `app/(auth)/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { AuthDecor } from "@/components/auth-decor";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-cream px-5 py-12">
      <AuthDecor />
      <div className="relative z-[1] w-full max-w-[26rem]">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors. (Pages under `(auth)` don't exist yet; Next will warn at runtime only — that's fine until Task 7.)

- [ ] **Step 4: Commit**

```bash
git add "components/auth-decor.tsx" "app/(auth)/layout.tsx"
git commit -m "Add cozy auth shell with pastel decor"
```

---

### Task 7: Welcome, sign-up, and sign-in pages

**Files:**
- Create: `app/(auth)/welcome/page.tsx`
- Create: `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Create: `app/(auth)/sign-in/[[...sign-in]]/page.tsx`

**Interfaces:**
- Consumes: `SignIn`, `SignUp`, `ClerkLoading`, `ClerkLoaded` from `@clerk/nextjs`; `SoftDotLoader` from `@/components/soft-dot-loader`.
- Produces: `/welcome`, `/sign-up`, `/sign-in` routes.

- [ ] **Step 1: Write `app/(auth)/welcome/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";

export default function WelcomePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[32px] bg-paper px-7 py-10 text-center shadow-lift ring-1 ring-line/60"
    >
      <span className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-cream-deep text-5xl shadow-soft">
        🌸
      </span>
      <h1 className="font-display text-[2.4rem] font-semibold leading-tight text-ink">
        Start your little world
      </h1>
      <p className="mx-auto mt-3 max-w-[22rem] text-[1.02rem] leading-relaxed text-brown">
        Make cute little lists for everything you love, hate, and want to remember.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/sign-up"
          className="rounded-pill bg-ink px-6 py-4 text-[1rem] font-bold text-cream shadow-soft transition-colors hover:bg-ink-soft"
        >
          Create my Little Lists
        </Link>
        <Link
          href="/sign-in"
          className="rounded-pill bg-paper px-6 py-4 text-[1rem] font-bold text-brown ring-1 ring-line transition-colors hover:bg-cream-deep"
        >
          I already have an account
        </Link>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Write `app/(auth)/sign-up/[[...sign-up]]/page.tsx`**

```tsx
import { SignUp, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { SoftDotLoader } from "@/components/soft-dot-loader";

export default function SignUpPage() {
  return (
    <div className="text-center">
      <h1 className="font-display text-[2rem] font-semibold leading-tight text-ink">
        Let&apos;s make your first little world
      </h1>
      <p className="mt-2 text-[0.98rem] text-brown">Your tiny archive starts here.</p>
      <div className="mt-6 flex justify-center">
        <ClerkLoading>
          <SoftDotLoader label="warming up your world" />
        </ClerkLoading>
        <ClerkLoaded>
          <SignUp />
        </ClerkLoaded>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `app/(auth)/sign-in/[[...sign-in]]/page.tsx`**

```tsx
import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { SoftDotLoader } from "@/components/soft-dot-loader";

export default function SignInPage() {
  return (
    <div className="text-center">
      <h1 className="font-display text-[2rem] font-semibold leading-tight text-ink">
        Welcome back to your little worlds
      </h1>
      <p className="mt-2 text-[0.98rem] text-brown">Your tiny archive missed you.</p>
      <div className="mt-6 flex justify-center">
        <ClerkLoading>
          <SoftDotLoader label="opening your little worlds" />
        </ClerkLoading>
        <ClerkLoaded>
          <SignIn />
        </ClerkLoaded>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/welcome" "app/(auth)/sign-up" "app/(auth)/sign-in"
git commit -m "Add branded welcome, sign-up, and sign-in pages"
```

---

### Task 8: Wire real user identity + sign-out

**Files:**
- Modify: `app/(app)/page.tsx` (greeting at line ~40)
- Modify: `components/profile-header.tsx` (name at line ~41)
- Modify: `app/(app)/profile/page.tsx` (add sign-out control)

**Interfaces:**
- Consumes: `useUser`, `SignOutButton` from `@clerk/nextjs`.
- Produces: greeting and profile show the Clerk first name with mock fallback; profile has a working sign-out.

- [ ] **Step 1: Greeting in `app/(app)/page.tsx`** — add the import and use the real name.

Add to the import block near the top (with the other imports):
```tsx
import { useUser } from "@clerk/nextjs";
```
Inside `HomeScreen`, just after `const { lists, profile } = useStore();`, add:
```tsx
  const { user } = useUser();
```
Change the greeting line from:
```tsx
        <p className="text-[0.92rem] font-bold text-brown">Hi {profile.name} ✨</p>
```
to:
```tsx
        <p className="text-[0.92rem] font-bold text-brown">Hi {user?.firstName ?? profile.name} ✨</p>
```

- [ ] **Step 2: Name in `components/profile-header.tsx`** — add the import and use the real name.

Add with the other imports:
```tsx
import { useUser } from "@clerk/nextjs";
```
Inside `ProfileHeader`, just after `const { profile, setProfileTheme, fireCelebration } = useStore();`, add:
```tsx
  const { user } = useUser();
```
Change the heading from:
```tsx
            <h1 className="font-display text-[1.8rem] font-semibold leading-none text-[var(--t-ink)]">
              {profile.name}
            </h1>
```
to:
```tsx
            <h1 className="font-display text-[1.8rem] font-semibold leading-none text-[var(--t-ink)]">
              {user?.firstName ?? profile.name}
            </h1>
```

- [ ] **Step 3: Sign-out control in `app/(app)/profile/page.tsx`**

Add with the other imports:
```tsx
import { SignOutButton } from "@clerk/nextjs";
```
Add a new section just before the closing `</div>` of the returned tree (after the featured-lists `</section>`):
```tsx
      <div className="mt-10 mb-4 flex justify-center">
        <SignOutButton>
          <button
            type="button"
            className="rounded-pill bg-paper px-6 py-3 text-[0.92rem] font-bold text-brown ring-1 ring-line shadow-soft transition-colors hover:bg-cream-deep"
          >
            Sign out of your little world
          </button>
        </SignOutButton>
      </div>
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/page.tsx" "components/profile-header.tsx" "app/(app)/profile/page.tsx"
git commit -m "Show real Clerk name in greeting/profile and add sign-out"
```

---

### Task 9: Full verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Lint**

Run:
```bash
npm run lint
```
Expected: passes (no errors). Fix any reported issues in the files they point to, then re-run.

- [ ] **Step 2: Production build**

Run:
```bash
npm run build
```
Expected: build succeeds. The route list shows `/`, `/welcome`, `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`, `/profile`, `/people`, `/person/[id]`, `/list/[id]`, and a proxy/middleware entry.

- [ ] **Step 3: Start the dev server in the background**

Run:
```bash
npm run dev
```
Wait until it logs `Ready` / a local URL (default `http://localhost:3000`).

- [ ] **Step 4: Verify signed-out redirect to /welcome**

Run:
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/
```
Expected: a `307` (or `308`) with redirect URL ending in `/welcome`. Also check a deep route:
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/profile
```
Expected: redirect to `/welcome`.

- [ ] **Step 5: Verify public auth routes render (no redirect)**

Run:
```bash
for p in welcome sign-in sign-up; do
  echo -n "$p -> "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/$p";
done
```
Expected: each returns `200`.

- [ ] **Step 6: Visual + credentialed check (manual, by user)**

In a browser:
1. Visit `http://localhost:3000` → lands on `/welcome` styled as Little Lists (cream, pastel blobs, sparkles, two pill CTAs).
2. Click **Create my Little Lists** → `/sign-up` shows the skinned Clerk card (28px radius, cream, pill button, soft inputs, branded loader flash).
3. Complete sign-up/sign-in with a real account → redirected to `/` and the existing app loads; greeting reads `Hi <your first name> ✨`.
4. Reload `/welcome` while signed in → redirected to `/`.
5. Go to `/profile` → **Sign out of your little world** signs out and returns to `/welcome`.

- [ ] **Step 7: Stop the dev server**

Stop the background `npm run dev` process.

---

## Self-Review

**Spec coverage:**
- Welcome / sign-up / sign-in screens → Tasks 6–7. ✓
- Auth loading/checking state → `ClerkLoading` + `SoftDotLoader` in Task 7. ✓
- Protected app routes + redirect unauthenticated → welcome, authenticated → home → Task 5 (`proxy.ts`). ✓
- Prebuilt `<SignIn />`/`<SignUp />` wrapped in custom pages → Task 7. ✓
- `appearance` config at `lib/clerkAppearance.ts`, reused by both → Tasks 2, 4, 7. ✓
- Decorative sparkles / pastel blobs / sticker badges → Task 6 (`AuthDecor`). ✓
- Exact copy and palette → Global Constraints + Tasks 7. ✓
- Existing prototype keeps working after sign-in (localStorage untouched) → Tasks 3–4 move files unchanged; store not modified. ✓
- No Prisma/Neon/DB/APIs/sharing → nothing in the plan adds them. ✓
- Sign-out (user decision) → Task 8. ✓
- Real name wiring (user decision) → Task 8. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `clerkAppearance` (Task 2) consumed verbatim in Tasks 4 & 7. `useUser()`/`user?.firstName` used identically in both edits (Task 8). Clerk component names (`SignIn`, `SignUp`, `SignOutButton`, `ClerkLoading`, `ClerkLoaded`, `clerkMiddleware`, `createRouteMatcher`) match their `@clerk/nextjs` / `@clerk/nextjs/server` exports. ✓

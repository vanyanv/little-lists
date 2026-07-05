---
name: verify
description: How to run and drive Little Lists locally to verify changes end-to-end (dev server, test signups via Clerk, DB resets).
---

# Verifying Little Lists

## Launch

```bash
npm run dev          # Next 16.2.9 (Turbopack), http://localhost:3000, ready in ~1s
```

Watch the server log for `ensureProfileForClerkUser failed` — a known, tolerated
upsert race on first signup (P2002); it retries next request. If the server ever
wedges (requests hang, `next-server` pins a CPU core), kill and restart it:
`pkill -f next-server` — seen once after a first-compile + fresh-signup collision.

## Drive it (Playwright MCP)

- Clerk runs in **development mode** (`pk_test`), so test signups work:
  sign up with `anything+clerk_test@example.com`, any password, and use
  verification code **424242**. Each signup mints a real Profile row in Neon.
- Sign out from the browser: `await window.Clerk.signOut()` via evaluate.
- Fresh users are redirected to `/app/onboarding`; completed users bounce back
  to `/app` from it.
- The app is a fixed 440px mobile column; accessibility snapshots are reliable
  (cards/buttons/switches all have roles and pressed/checked states).
- The toast auto-dismisses after 2.4s — to observe it, navigate first (returns
  at domcontentloaded, before hydration) and `wait_for` the text immediately.

## Reset state for re-testing onboarding

```bash
echo 'UPDATE "Profile" SET "onboardingCompleted"=false, "demoSeeded"=false, "checklistDismissed"=false;' | npx prisma db execute --stdin
```

(Optionally clear that user's lists/people with prisma studio or SQL.)
Demo-banner dismissal is localStorage `ll:demo-banner-dismissed`; onboarding
toast handoff is sessionStorage `ll:onboarding-toast`.

## Gotchas

- Prisma migrations use the **unpooled** Neon URL via `prisma.config.ts`; run
  plain `npx prisma migrate dev` from the repo root.
- After schema changes, stale editor/tsc types mean `npx prisma generate` and
  `rm -rf .next/types .next/dev/types`.
- Repo lint currently has ~7 pre-existing errors (setState-in-effect and
  unescaped entities); don't chase them as regressions.
- Playwright MCP can only write screenshots inside the repo (its allowed roots
  reject scratchpad paths) — save with relative filenames, then `mv` them to
  the scratchpad before committing.
- Native emoji may render monochrome in this WSL browser (missing color-emoji
  font coverage varies by glyph) — don't mistake it for a styling regression.

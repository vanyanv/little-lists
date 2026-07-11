# Trust & Data Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Little Lists honestly private and portable — strip the half-built public-profile surface, ship complete JSON+CSV export, add a Svix-verified account-deletion webhook plus an in-app delete, and make the privacy page accurate.

**Architecture:** Four independent tasks. A removes dead schema/type/UI. B adds a pure export library behind an authed download route. C adds a public webhook route + a server action, both funneling to the same cascade delete. D rewrites copy. Every DB delete relies on the existing `onDelete: Cascade` from `Profile`.

**Tech Stack:** Next.js 16 (App Router, route handlers, server actions), Prisma 7, Clerk 7 (`clerkMiddleware` lives in `proxy.ts`, not `middleware.ts`), Vitest 4, new deps `svix` + `jszip`.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing App Router / route-handler / server-action code (AGENTS.md — this Next.js differs from training data; note middleware is `proxy.ts`).
- Auth is enforced by `proxy.ts` (`clerkMiddleware`): signed-out requests to any non-`isPublicRoute` route are redirected to `/sign-in`, and the matcher runs for all `/api/*`. The deletion **webhook must be added to `isPublicRoute`**; the export route stays protected (authed session passes).
- Every model relates to `Profile` with `onDelete: Cascade` — deleting one `Profile` row wipes lists/items/people/details/scraps/analytics.
- No em dashes in user-facing copy (repo convention).
- Test runner is Vitest: `npm test`; colocate tests as `*.test.ts`. Run `npx tsc --noEmit` after schema/type changes; the lint baseline is 3 errors + 1 warning in pre-existing untouched files — do not chase those, only ensure no NEW errors on touched files.
- After any schema change: `npx prisma migrate dev` (uses the unpooled URL via `prisma.config.ts`), then `npx prisma generate`, and `rm -rf .next/types .next/dev/types` if tsc shows stale types.
- Never expose another user's data: every query in the export route and actions is scoped by the resolved `clerkUserId`.

---

### Task 1: Strip the public-profile surface

**Files:**
- Create: `prisma/migrations/<timestamp>_strip_public_profile/migration.sql` (via `prisma migrate dev`)
- Modify: `prisma/schema.prisma`, `lib/types.ts:207`, `lib/server/serialize.ts` (mapProfile), `lib/actions.ts` (UpdateProfilePatch + updateProfileAction), `components/profile-header.tsx`, `app/app/(main)/layout.tsx` (FALLBACK_PROFILE)
- Test: rely on `npx tsc --noEmit` + full suite (no dangling refs); no new unit test (pure deletion of dead surface)

**Interfaces:**
- Consumes: nothing new.
- Produces: a `Profile` client type with fields `{ name, avatarEmoji, theme, demoSeeded, checklistDismissed }` only.

- [ ] **Step 1: Edit the Prisma schema**

In `prisma/schema.prisma`: remove `handle`, `bio`, `avatarUrl` from `model Profile`; remove the `visibility Visibility @default(private)` line from `model List`; delete the `enum Visibility { ... }` block.

- [ ] **Step 2: Generate the migration**

Run: `npx prisma migrate dev --name strip_public_profile`
Expected: creates a migration dropping the three Profile columns, the List column, and the `Visibility` type; applies it; regenerates the client. If it warns about data loss, accept (these columns are unused).

- [ ] **Step 3: Update the client Profile type**

In `lib/types.ts` replace the `Profile` interface (currently at line 207) with:

```ts
export interface Profile {
  name: string;
  avatarEmoji: string;
  theme: ThemeColor;
  /** onboarding seeded example content — drives the "make them yours" banner */
  demoSeeded: boolean;
  /** the Home first-steps checklist was hidden (or shouldn't be shown) */
  checklistDismissed: boolean;
}
```

- [ ] **Step 4: Update mapProfile**

In `lib/server/serialize.ts`, replace the `mapProfile` return with only the surviving fields:

```ts
export function mapProfile(row: DbProfile): Profile {
  return {
    name: row.displayName?.trim() || "friend",
    avatarEmoji: "🌙",
    theme: (row.themeColor as ThemeColor) ?? "blush",
    demoSeeded: row.demoSeeded,
    checklistDismissed: row.checklistDismissed,
  };
}
```

- [ ] **Step 5: Update UpdateProfilePatch + updateProfileAction**

In `lib/actions.ts`, remove `handle?` and `bio?` from `UpdateProfilePatch`, and remove the `...(patch.handle !== undefined ...)` and `...(patch.bio !== undefined ...)` spreads from `updateProfileAction`'s `data`. Leave `displayName`, `themeColor`, `checklistDismissed`.

- [ ] **Step 6: Update FALLBACK_PROFILE**

In `app/app/(main)/layout.tsx`, replace the `FALLBACK_PROFILE` literal so it matches the new `Profile` type exactly (remove `handle`, `bio`, `tags`, `featuredListIds`, `isPublic`):

```ts
const FALLBACK_PROFILE: Profile = {
  name: "friend",
  avatarEmoji: "🌙",
  theme: "blush",
  demoSeeded: false,
  checklistDismissed: true,
};
```

- [ ] **Step 7: Clean profile-header.tsx**

In `components/profile-header.tsx`, remove the `{profile.handle && (...)}` block (lines ~33-34) and the `{profile.isPublic ? "Public little world" : "Just for me"}` expression (line ~38) — replace the latter's surrounding element with the static text `Just for me` (the app is private-only now). Keep the rest of the header (name, avatar, theme) intact.

- [ ] **Step 8: Find any remaining readers**

Run: `grep -rnE "\.handle|\.bio\b|\.isPublic|featuredListIds|\.visibility|profile\.tags" components app lib | grep -v node_modules`
Expected: no matches remain (all removed). If any remain, remove/neutralize them following the same pattern.

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit` → clean (proves no dangling references).
Run: `npm test` → full suite green.
Run: `npm run lint` → no NEW errors on touched files.

- [ ] **Step 10: Commit**

```bash
git add prisma/ lib/types.ts lib/server/serialize.ts lib/actions.ts components/profile-header.tsx "app/app/(main)/layout.tsx"
git commit -m "feat(trust): strip the half-built public-profile surface"
```

---

### Task 2: Export (JSON + CSV)

**Files:**
- Create: `lib/export.ts`, `lib/export.test.ts`, `app/api/export/route.ts`
- Modify: `app/app/(main)/profile/page.tsx` (add Export section), `package.json` (add `jszip`)
- Test: `lib/export.test.ts`

**Interfaces:**
- Consumes: Prisma models; `getCurrentUserProfile` from `@/lib/server/profile`.
- Produces:
  - `buildExportJson(input: ExportInput): ExportDocument`
  - `toCsv(rows: Record<string, unknown>[], columns: string[]): string`
  - `buildCsvSections(input: ExportInput): { name: string; csv: string }[]` (five sections)

- [ ] **Step 1: Add the jszip dependency**

Run: `npm install jszip`
Expected: `jszip` in `package.json` dependencies.

- [ ] **Step 2: Write failing tests for the export library**

```ts
// lib/export.test.ts
import { describe, it, expect } from "vitest";
import { toCsv, buildExportJson, buildCsvSections } from "./export";

const sample = {
  profile: { name: "Sam", theme: "blush" },
  lists: [{ id: "l1", title: "Movies", emoji: "🎬", template: "movie",
    items: [{ id: "i1", title: "Coraline", note: "spooky, good", status: "want", tags: ["a"] }] }],
  people: [{ id: "p1", name: "Mom", emoji: "🌷",
    details: [{ id: "d1", section: "loves", title: "tea", note: null, tags: [] }] }],
  scraps: [{ id: "s1", text: "book rec: Tomorrow x3" }],
};

describe("toCsv", () => {
  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    const csv = toCsv([{ a: 'he said "hi", ok', b: "line1\nline2" }], ["a", "b"]);
    expect(csv).toBe('a,b\r\n"he said ""hi"", ok","line1\nline2"\r\n');
  });
  it("renders a header even with no rows", () => {
    expect(toCsv([], ["a", "b"])).toBe("a,b\r\n");
  });
  it("stringifies arrays as a semicolon-joined field (no quoting needed — no comma)", () => {
    expect(toCsv([{ tags: ["x", "y"] }], ["tags"])).toBe("tags\r\nx; y\r\n");
  });
});

describe("buildExportJson", () => {
  it("nests items under lists and details under people, with an exportedAt", () => {
    const doc = buildExportJson({ ...sample, exportedAt: "2026-07-11T00:00:00Z" });
    expect(doc.exportedAt).toBe("2026-07-11T00:00:00Z");
    expect(doc.lists[0].items[0].title).toBe("Coraline");
    expect(doc.people[0].details[0].title).toBe("tea");
    expect(doc.scraps[0].text).toBe("book rec: Tomorrow x3");
  });
});

describe("buildCsvSections", () => {
  it("returns five named sections and flattens list title onto items", () => {
    const secs = buildCsvSections({ ...sample, exportedAt: "2026-07-11T00:00:00Z" });
    expect(secs.map((s) => s.name)).toEqual(["lists", "items", "people", "details", "scraps"]);
    const items = secs.find((s) => s.name === "items")!.csv;
    expect(items).toContain("Movies"); // listTitle flattened onto the item row
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- lib/export.test.ts`
Expected: FAIL — module `./export` has no such exports.

- [ ] **Step 4: Implement lib/export.ts**

```ts
// lib/export.ts — pure, no I/O, unit-testable.
export interface ExportInput {
  exportedAt: string;
  profile: { name: string; theme: string };
  lists: Array<{ id: string; title: string; emoji: string; template: string;
    items: Array<{ id: string; title: string; note: string | null; status: string | null; tags: string[] }> }>;
  people: Array<{ id: string; name: string; emoji: string;
    details: Array<{ id: string; section: string; title: string; note: string | null; tags: string[] }> }>;
  scraps: Array<{ id: string; text: string }>;
}
export type ExportDocument = ExportInput;

export function buildExportJson(input: ExportInput): ExportDocument {
  return input; // already the complete nested shape; explicit for a stable contract
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = Array.isArray(value) ? value.join("; ") : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(cell).join(",");
  const body = rows.map((r) => columns.map((c) => cell(r[c])).join(","));
  return [header, ...body].join("\r\n") + "\r\n";
}

export function buildCsvSections(input: ExportInput): { name: string; csv: string }[] {
  const lists = input.lists.map((l) => ({ id: l.id, title: l.title, emoji: l.emoji, template: l.template }));
  const items = input.lists.flatMap((l) =>
    l.items.map((i) => ({ listId: l.id, listTitle: l.title, id: i.id, title: i.title,
      status: i.status, note: i.note, tags: i.tags })));
  const people = input.people.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji }));
  const details = input.people.flatMap((p) =>
    p.details.map((d) => ({ personId: p.id, personName: p.name, id: d.id, section: d.section,
      title: d.title, note: d.note, tags: d.tags })));
  const scraps = input.scraps.map((s) => ({ id: s.id, text: s.text }));
  return [
    { name: "lists", csv: toCsv(lists, ["id", "title", "emoji", "template"]) },
    { name: "items", csv: toCsv(items, ["listId", "listTitle", "id", "title", "status", "note", "tags"]) },
    { name: "people", csv: toCsv(people, ["id", "name", "emoji"]) },
    { name: "details", csv: toCsv(details, ["personId", "personName", "id", "section", "title", "note", "tags"]) },
    { name: "scraps", csv: toCsv(scraps, ["id", "text"]) },
  ];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- lib/export.test.ts`
Expected: PASS.

- [ ] **Step 6: Implement the export route**

```ts
// app/api/export/route.ts
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/lib/server/profile";
import { buildExportJson, buildCsvSections, type ExportInput } from "@/lib/export";
import { templateToUi } from "@/lib/server/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const profile = await getCurrentUserProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });
  const userId = profile.clerkUserId;

  const [lists, people, scraps] = await Promise.all([
    prisma.list.findMany({ where: { userId }, orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { createdAt: "asc" } } } }),
    prisma.person.findMany({ where: { userId }, orderBy: { createdAt: "asc" },
      include: { details: { orderBy: { createdAt: "asc" } } } }),
    prisma.scrap.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  const input: ExportInput = {
    exportedAt: new Date().toISOString(),
    profile: { name: profile.displayName, theme: profile.themeColor ?? "blush" },
    lists: lists.map((l) => ({ id: l.id, title: l.title, emoji: l.emoji,
      template: String(templateToUi(l.templateType)),
      items: l.items.map((i) => ({ id: i.id, title: i.title, note: i.note,
        status: i.status, tags: i.tags })) })),
    people: people.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji,
      details: p.details.map((d) => ({ id: d.id, section: d.section, title: d.title,
        note: d.note, tags: d.tags })) })),
    scraps: scraps.map((s) => ({ id: s.id, text: s.text })),
  };

  const format = new URL(req.url).searchParams.get("format") ?? "json";

  if (format === "csv") {
    const zip = new JSZip();
    for (const { name, csv } of buildCsvSections(input)) zip.file(`${name}.csv`, csv);
    const blob = await zip.generateAsync({ type: "uint8array" });
    return new Response(blob, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": 'attachment; filename="little-lists-export.zip"',
      },
    });
  }

  return new Response(JSON.stringify(buildExportJson(input), null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="little-lists-export.json"',
    },
  });
}
```

Note: confirm `templateToUi` is exported from `lib/server/serialize.ts` while editing; if it is not exported, export it (it is used by `mapList` in that file).

- [ ] **Step 7: Add the Export section to the profile page**

In `app/app/(main)/profile/page.tsx`, add an "Export your data" section using the existing row/section styling. Two anchors (not client fetches, so the browser handles the download):

```tsx
<a
  href="/api/export?format=json"
  download
  className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.95rem] font-semibold text-ink transition-colors hover:bg-cream-deep ${focusRingInset}`}
>
  Download everything (JSON)
  <span aria-hidden className="text-brown-soft">↓</span>
</a>
<a
  href="/api/export?format=csv"
  download
  className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.95rem] font-semibold text-ink transition-colors hover:bg-cream-deep ${focusRingInset}`}
>
  Download as spreadsheets (CSV)
  <span aria-hidden className="text-brown-soft">↓</span>
</a>
```

Place it within the page's existing section layout, following the surrounding markup (wrap in whatever card/`section` the neighboring rows use). Import `focusRingInset` if not already imported (it is used by `CornerRow` in the same file).

- [ ] **Step 8: Verify**

Run: `npm test` → green (new export tests included).
Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → succeeds (route compiles).

- [ ] **Step 9: Commit**

```bash
git add lib/export.ts lib/export.test.ts app/api/export/route.ts "app/app/(main)/profile/page.tsx" package.json package-lock.json
git commit -m "feat(trust): complete JSON and CSV export of a user's data"
```

---

### Task 3: Account deletion (webhook + in-app)

**Files:**
- Create: `app/api/webhooks/clerk/route.ts`, `app/api/webhooks/clerk/route.test.ts`
- Modify: `proxy.ts` (make the webhook public), `lib/actions.ts` (add `deleteAccountAction`), `app/app/(main)/profile/page.tsx` (Delete-account row), `package.json` (add `svix`), `.env.example` or a documented note
- Test: `app/api/webhooks/clerk/route.test.ts`

**Interfaces:**
- Consumes: `svix` `Webhook`; `clerkClient` from `@clerk/nextjs/server`; `prisma`.
- Produces: `deleteAccountAction(): Promise<void>` (server action).

- [ ] **Step 1: Add svix**

Run: `npm install svix`
Expected: `svix` in dependencies.

- [ ] **Step 2: Make the webhook route public in proxy.ts**

In `proxy.ts`, add `"/api/webhooks/clerk"` to the `createRouteMatcher([...])` list for `isPublicRoute` (so a signed-out Clerk POST is not redirected to `/sign-in`):

```ts
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/terms",
  "/api/webhooks/clerk",
]);
```

- [ ] **Step 3: Write failing tests for the webhook**

```ts
// app/api/webhooks/clerk/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const verify = vi.fn();
const deleteMany = vi.fn();
vi.mock("svix", () => ({ Webhook: vi.fn().mockImplementation(() => ({ verify })) }));
vi.mock("@/lib/prisma", () => ({ prisma: { profile: { deleteMany } } }));

import { POST } from "./route";

function req(body: object) {
  return new Request("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: { "svix-id": "1", "svix-timestamp": "1", "svix-signature": "v1,x" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => { verify.mockReset(); deleteMany.mockReset(); process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_test"; });

describe("clerk webhook", () => {
  it("deletes the profile on a verified user.deleted event", async () => {
    verify.mockReturnValue({ type: "user.deleted", data: { id: "user_123" } });
    const res = await POST(req({}));
    expect(res.status).toBe(200);
    expect(deleteMany).toHaveBeenCalledWith({ where: { clerkUserId: "user_123" } });
  });

  it("rejects an invalid signature with 400 and does not delete", async () => {
    verify.mockImplementation(() => { throw new Error("bad signature"); });
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("ignores other event types with 200 and no delete", async () => {
    verify.mockReturnValue({ type: "user.created", data: { id: "user_123" } });
    const res = await POST(req({}));
    expect(res.status).toBe(200);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- app/api/webhooks/clerk/route.test.ts`
Expected: FAIL — `./route` has no `POST` export.

- [ ] **Step 5: Implement the webhook route**

```ts
// app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: { type: string; data: { id?: string } };
  try {
    event = new Webhook(secret).verify(payload, headers) as typeof event;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "user.deleted" && event.data.id) {
    // deleteMany is idempotent; cascade wipes the user's whole little world.
    await prisma.profile.deleteMany({ where: { clerkUserId: event.data.id } });
  }
  return new Response("ok", { status: 200 });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- app/api/webhooks/clerk/route.test.ts`
Expected: PASS (all three cases).

- [ ] **Step 7: Add deleteAccountAction**

In `lib/actions.ts` (add the import `import { clerkClient } from "@clerk/nextjs/server";` near the top), append:

```ts
/* ── account ─────────────────────────────────────────────────────────── */

/**
 * Delete the signed-in user's account and all their data. Removes the DB row
 * immediately (belt-and-suspenders: the Clerk user.deleted webhook also wipes
 * it), then deletes the Clerk user, which ends their session.
 */
export async function deleteAccountAction(): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.profile.deleteMany({ where: { clerkUserId } });
  const client = await clerkClient();
  await client.users.deleteUser(clerkUserId);
}
```

- [ ] **Step 8: Add the Delete-account control to the profile page**

In `app/app/(main)/profile/page.tsx`, add a danger-styled "Delete my account" row that opens a typed-confirm dialog and, on confirmation, calls `deleteAccountAction` then signs out. Use the existing `openConfirm` from `useUi` and `useClerk().signOut`. Follow the existing confirm pattern in this file (it already uses `openConfirm`/`showToast`). Concretely:

```tsx
const { signOut } = useClerk();
// ...
async function onDeleteAccount() {
  await deleteAccountAction();
  await signOut({ redirectUrl: "/" });
}
```

Wire a button that calls `openConfirm({ title: "Delete your account?", body: "This erases everything in your little world. It can't be undone.", confirmLabel: "Delete forever", onConfirm: onDeleteAccount })` — match the actual `openConfirm` signature in `lib/ui` while editing (inspect it; do not invent fields). Style the row with danger emphasis consistent with the app (e.g. `text-red-600`/existing danger token if one exists).

Import `deleteAccountAction` from `@/lib/actions`.

- [ ] **Step 9: Document the env var**

Add `CLERK_WEBHOOK_SIGNING_SECRET=` to `.env.example` if the repo has one; otherwise add a short "Webhook setup" note to the plan's companion or the privacy/README. In the commit body, state: the user must add a Clerk webhook endpoint pointing at `/api/webhooks/clerk`, subscribe to `user.deleted`, and set `CLERK_WEBHOOK_SIGNING_SECRET` in `.env.local` and production.

- [ ] **Step 10: Verify**

Run: `npm test` → green (webhook tests included).
Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → succeeds.

- [ ] **Step 11: Commit**

```bash
git add app/api/webhooks/clerk/ proxy.ts lib/actions.ts "app/app/(main)/profile/page.tsx" package.json package-lock.json
git commit -m "feat(trust): verified deletion webhook + in-app delete my account"
```

---

### Task 4: Precise privacy-page copy

**Files:**
- Modify: `components/landing/privacy.tsx` (and any privacy content source it renders)
- Test: none (copy); verify by reading the rendered page

**Interfaces:**
- Consumes: nothing.
- Produces: accurate copy; no code contract.

- [ ] **Step 1: Read the current privacy component**

Read `components/landing/privacy.tsx` fully to learn its structure, section components, and animation so the rewrite swaps content without breaking layout.

- [ ] **Step 2: Rewrite the content**

Replace the body copy so it states, in the app's warm voice and with NO em dashes:
- **What we keep & retention:** everything you save stays until you delete it or your account; deletion is immediate and erases all of it.
- **Who touches it (subprocessors):** Clerk (sign-in), Neon (the database that stores your little world), our host, and media lookups (TMDB / Open Library) that we query to find titles — those queries fetch results and are not sold or mined.
- **Taking it with you:** download everything as JSON or CSV anytime from your profile.
- **Leaving:** delete your account from your profile or your account portal; both wipe your data.
- **Security & stance:** private by default, no public profiles, no sharing, no ads, nothing sold. Encrypted in transit; auth handled by Clerk.
- **Backups:** the database provider keeps operational backups for reliability; deleted data is not recoverable once removed.

Keep it concise and skimmable (short headed paragraphs or a list), matching the existing component's visual rhythm.

- [ ] **Step 3: Verify no public-surface language remains**

Run: `grep -niE "handle|public profile|featured|share|follower" components/landing/privacy.tsx`
Expected: no stale references implying a public/social surface (except an explicit "no public profiles / no sharing" reassurance, which is fine).

- [ ] **Step 4: Verify build + render**

Run: `npm run build` → succeeds.
(Manual: the controller runs the live smoke; a signed-out visit to `/privacy` reads accurately.)

- [ ] **Step 5: Commit**

```bash
git add components/landing/privacy.tsx
git commit -m "docs(trust): precise privacy copy for retention, export, deletion, subprocessors"
```

---

## Self-Review notes

- **Spec coverage:** 1 = strip (schema+type+serialize+UI); 2 = export lib+route+UI; 3 = webhook+action+middleware+UI+env; 4 = privacy copy. All four spec sections mapped.
- **Verify-while-editing flags:** `templateToUi` export (B6), the `openConfirm` signature (C8), the profile page's existing section wrapper markup (B7/C8), and any danger color token. Each says "inspect while editing; do not invent."
- **External step (not automatable):** configuring the Clerk webhook endpoint + `CLERK_WEBHOOK_SIGNING_SECRET` — the webhook code and in-app delete are testable without it, but end-to-end webhook delivery needs the user's dashboard setup.
- **Deferred:** any public sharing surface (own future slice).

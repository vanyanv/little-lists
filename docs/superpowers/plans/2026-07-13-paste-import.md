# Paste-to-Import + OG Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paste a list from Notes → items appear with real covers automatically; plus an OG social card so shared links unfurl.

**Architecture:** A pure parsing/matching module (`lib/import.ts`), one transactional bulk server action + store mutation, a self-contained `ImportSheet` mounted locally in the list-detail page (two entry points: ⋯ menu + empty-state CTA), and a build-time `opengraph-image.tsx`. Media matching is fully automatic (spec rev 2): top hit auto-applies via a best-hit picker (exact-title beats provider order), batch Undo replaces the review gate.

**Tech Stack:** Next 16 / React 19, Prisma transaction, Vitest, Next ImageResponse.

**Spec:** `docs/superpowers/specs/2026-07-13-paste-import-design.md`

## Global Constraints

- Copy is warm-voice, no em dashes, no robotic labels.
- Cap **50 lines** per paste; truncation message: `50 at a time for now, paste the rest after ✨`.
- Line clip: 200 chars (`IMPORT_LINE_MAX`).
- Analytics properties are categorical/boolean/count only. Per-item `item_created` gets `flow: "import"`; ONE summary `feature_used { feature: "paste_import", lines, matched, skipped }`.
- Escape/dismiss during matching aborts — nothing saves before the single transaction.
- Gates before each commit: `npm run lint` (0 problems), `npx vitest run`, and `npm run build` for tasks 2-4.
- Dev-server smoke account: `s0smoke+clerk_test@example.com`, Clerk code 424242.

---

### Task 1: `lib/import.ts` — parsing + best-hit picking (TDD)

**Files:**
- Create: `lib/import.ts`
- Test: `lib/import.test.ts`

**Interfaces:**
- Consumes: `SearchHit` from `@/lib/search/types`.
- Produces: `IMPORT_MAX_LINES = 50`, `IMPORT_LINE_MAX = 200`, `parsePastedList(text: string): { lines: string[]; truncated: boolean }`, `pickBestHit(line: string, hits: SearchHit[]): SearchHit | undefined` — Task 3 imports all four.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/import.test.ts
import { describe, expect, it } from "vitest";
import { parsePastedList, pickBestHit, IMPORT_MAX_LINES } from "./import";
import type { SearchHit } from "./search/types";

const hit = (title: string, sourceId = title): SearchHit => ({
  sourceId,
  type: "movie",
  title,
  subtitle: "2020",
});

describe("parsePastedList", () => {
  it("splits lines, trims, drops empties", () => {
    expect(parsePastedList("Dune\n\n  Heat  \n").lines).toEqual(["Dune", "Heat"]);
  });

  it("strips bullets, numbering, and checkbox markers", () => {
    const text = "- Dune\n* Heat\n• Arrival\n1. Tenet\n2) Alien\n(3) Up\n[ ] Coco\n[x] Ponyo\n☐ Brave";
    expect(parsePastedList(text).lines).toEqual([
      "Dune", "Heat", "Arrival", "Tenet", "Alien", "Up", "Coco", "Ponyo", "Brave",
    ]);
  });

  it("dedupes case-insensitively within the paste", () => {
    expect(parsePastedList("Dune\ndune\nDUNE\nHeat").lines).toEqual(["Dune", "Heat"]);
  });

  it("caps at IMPORT_MAX_LINES and reports truncation", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Movie ${i}`).join("\n");
    const result = parsePastedList(text);
    expect(result.lines).toHaveLength(IMPORT_MAX_LINES);
    expect(result.truncated).toBe(true);
    expect(parsePastedList("One\nTwo").truncated).toBe(false);
  });

  it("clips overlong lines to 200 chars", () => {
    const long = "x".repeat(300);
    expect(parsePastedList(long).lines[0]).toHaveLength(200);
  });
});

describe("pickBestHit", () => {
  it("prefers the exact normalized title over provider order", () => {
    const hits = [hit("Dune: Part Two"), hit("Dune")];
    expect(pickBestHit("dune", hits)?.title).toBe("Dune");
  });

  it("falls back to a hit whose title starts with the line", () => {
    const hits = [hit("The Dune Enigma"), hit("Dune: Part Two")];
    expect(pickBestHit("dune:", hits)?.title).toBe("Dune: Part Two");
  });

  it("falls back to the provider's first hit when nothing is close", () => {
    const hits = [hit("Something Else"), hit("Another Thing")];
    expect(pickBestHit("zzz", hits)?.title).toBe("Something Else");
  });

  it("returns undefined for no hits", () => {
    expect(pickBestHit("dune", [])).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/import.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// lib/import.ts
import type { SearchHit } from "./search/types";

export const IMPORT_MAX_LINES = 50;
export const IMPORT_LINE_MAX = 200;

/** leading list decorations Notes-style pastes carry: bullets, numbering, checkboxes */
const LINE_MARKER =
  /^(?:[-*•·–—]|\(\d+\)|\d+[.)]|\[[ xX]?\]|[☐☑☒])\s*/;

export function parsePastedList(text: string): { lines: string[]; truncated: boolean } {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(LINE_MARKER, "").trim().slice(0, IMPORT_LINE_MAX);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }
  return { lines: lines.slice(0, IMPORT_MAX_LINES), truncated: lines.length > IMPORT_MAX_LINES };
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

/** the line's best match: exact normalized title, then prefix either way, then provider order */
export function pickBestHit(line: string, hits: SearchHit[]): SearchHit | undefined {
  if (hits.length === 0) return undefined;
  const q = normalize(line);
  return (
    hits.find((h) => normalize(h.title) === q) ??
    hits.find((h) => normalize(h.title).startsWith(q) || q.startsWith(normalize(h.title))) ??
    hits[0]
  );
}
```

- [ ] **Step 4: Run tests + lint** — `npx vitest run lib/import.test.ts` PASS; `npm run lint` 0.

- [ ] **Step 5: Commit** — `feat(import): pasted-list parser and best-hit picker`

---

### Task 2: Bulk save — `importItemsAction` + store `importItems` + flow union

**Files:**
- Modify: `lib/actions.ts` (`CreateItemInput.flow` at ~line 145; new action after `createItemAction`)
- Modify: `lib/store.tsx` (new `importItems` in `StoreValue` + implementation near `addItem`, ~line 193)

**Interfaces:**
- Consumes: existing `itemCreateData`, `requireUserProfile`, `recordProductEvent`, `mapItem`; store patterns from `addItem`.
- Produces: `importItemsAction(listId: string, inputs: CreateItemInput[]): Promise<Item[]>`; store `importItems(listId: string, inputs: CreateItemInput[]): Promise<Item[] | null>` — Task 3 calls the store method.

- [ ] **Step 1: Widen the flow union**

In `CreateItemInput`: `flow?: "quick" | "detailed" | "import";`

- [ ] **Step 2: Server action** (after `createItemAction`)

```ts
/** Transactional bulk create for paste-to-import. Rows get descending-offset
 *  createdAt so paste order reads top-down in the default recently-added sort
 *  (line 1 newest). Caps at 50 inputs; analytics: one summary event + one
 *  item_created per row with flow "import". */
export async function importItemsAction(listId: string, inputs: CreateItemInput[]): Promise<Item[]> {
  const { clerkUserId } = await requireUserProfile();
  const list = await prisma.list.findFirst({ where: { id: listId, userId: clerkUserId } });
  if (!list) {
    void recordProductEvent({
      userId: clerkUserId,
      name: "operation_error",
      properties: { action: "importItemsAction", code: "list_not_found" },
    });
    throw new Error("importItemsAction: list not found");
  }
  const batch = inputs.slice(0, 50);
  const base = Date.now();
  const rows = await prisma.$transaction(
    batch.map((input, i) =>
      prisma.listItem.create({
        data: {
          ...itemCreateData(clerkUserId, listId, input),
          createdAt: new Date(base + (batch.length - i)),
        },
      })
    )
  );
  const matched = batch.filter((i) => i.imageUrl).length;
  void recordProductEvent({
    userId: clerkUserId,
    name: "feature_used",
    properties: { feature: "paste_import", lines: batch.length, matched },
  });
  for (const input of batch) {
    void recordProductEvent({
      userId: clerkUserId,
      name: "item_created",
      properties: {
        hasPerson: false,
        hasNote: Boolean(input.note),
        hasRating: false,
        flow: "import",
      },
    });
  }
  return rows.map((row, i) => mapItem(row, batch[i].type));
}
```

(Adjust `mapItem`'s second argument to match `createItemAction`'s exact usage if it differs — mirror that call site verbatim.)

- [ ] **Step 3: Store mutation** — mirror `addItem`'s optimistic pattern exactly (read `lib/store.tsx`'s `addItem` useCallback first): optimistic temp items prepended to the list's `items` in paste order, swap with server rows on success, filter temps out on failure + rethrow. Signature `importItems(listId, inputs)`. Register in `StoreValue` and in the `actions` useMemo **with a dep array free of raw state** (the store test audits this — read the head of `lib/store.test.ts` if unsure).

- [ ] **Step 4: Gates** — `npm run lint` 0; `npx vitest run` all pass (store.test's dep-array audit is the one likely to bite); `npm run build`.

- [ ] **Step 5: Commit** — `feat(import): transactional bulk create with import flow analytics`

---

### Task 3: ImportSheet + entry points

**Files:**
- Create: `components/import-sheet.tsx`
- Modify: `app/app/(main)/list/[id]/page.tsx` (⋯ menu items ~line 140; first EmptyState ~line 318; lazy mount like `ListDnd` ~line 29)

**Interfaces:**
- Consumes: `parsePastedList`/`pickBestHit`/`IMPORT_MAX_LINES` (Task 1), store `importItems` + `deleteItem` (Task 2), `captureStatusFor` from `@/lib/types`, `isDuplicateTitle` from `@/lib/sort`, `BottomSheet`, `Button`, `Cover`, `SoftDotLoader`, `useUi().showToast`, `ITEM_TYPE_META`/`TEMPLATE_META` searchable flags.
- Produces: `<ImportSheet list={list} open={open} onClose={() => setImportOpen(false)} />`.

- [ ] **Step 1: Component**

```tsx
// components/import-sheet.tsx
"use client";

import { useRef, useState } from "react";
import type { CreateItemInput } from "@/lib/actions";
import type { List } from "@/lib/types";
import { TEMPLATE_META, ITEM_TYPE_META, captureStatusFor } from "@/lib/types";
import { parsePastedList, pickBestHit, IMPORT_MAX_LINES } from "@/lib/import";
import { isDuplicateTitle } from "@/lib/sort";
import type { SearchHit } from "@/lib/search/types";
import { useStoreActions } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { Cover } from "./cover";
import { SoftDotLoader } from "./soft-dot-loader";
import { sheetTitle, textareaField } from "@/lib/field";

type RowState =
  | { line: string; state: "waiting" }
  | { line: string; state: "matched"; hit: SearchHit }
  | { line: string; state: "as-typed" };

export function ImportSheet({ list, open, onClose }: { list: List; open: boolean; onClose: () => void }) {
  const { importItems, deleteItem } = useStoreActions();
  const { showToast } = useUi();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<RowState[] | null>(null); // null = compose step
  const [truncated, setTruncated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const kind = list.kind;
  const searchable = kind === "movie" || kind === "book" || kind === "music";

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRows(null);
    setText("");
    setTruncated(false);
  };
  const close = () => {
    reset(); // dismiss aborts: nothing saves before the single transaction
    onClose();
  };

  const save = async (finalRows: RowState[], skipped: number) => {
    const inputs: CreateItemInput[] = finalRows.map((r) => ({
      type: kind,
      title: r.state === "matched" ? r.hit.title : r.line,
      subtitle: r.state === "matched" ? r.hit.subtitle || undefined : undefined,
      status: captureStatusFor(list.template),
      seed: r.line,
      imageUrl: r.state === "matched" ? r.hit.imageUrl : undefined,
      meta: r.state === "matched" ? r.hit.meta : undefined,
      flow: "import",
    }));
    try {
      const created = await importItems(list.id, inputs);
      onClose();
      reset();
      if (created) {
        const skippedNote = skipped > 0 ? ` (${skipped} already here)` : "";
        showToast(`Tucked ${created.length} into ${list.title} ✨${skippedNote}`, {
          action: {
            label: "Undo",
            onAction: () => {
              for (const item of created) void deleteItem(list.id, item.id);
            },
          },
        });
      }
    } catch {
      setRows(null); // back to compose with the paste intact for a retry
      showToast("That didn't save. Let's try again 🌿");
    }
  };

  const start = async () => {
    const parsed = parsePastedList(text);
    setTruncated(parsed.truncated);
    // lines already in the list are skipped automatically, reported in the toast
    const fresh = parsed.lines.filter((l) => !isDuplicateTitle(l, list.items));
    const skipped = parsed.lines.length - fresh.length;
    if (fresh.length === 0) {
      showToast(skipped > 0 ? "All of those are already here ✨" : "Nothing to tuck in yet");
      return;
    }
    if (!searchable) {
      await save(fresh.map((line) => ({ line, state: "as-typed" as const })), skipped);
      return;
    }
    const working: RowState[] = fresh.map((line) => ({ line, state: "waiting" as const }));
    setRows([...working]);
    const controller = new AbortController();
    abortRef.current = controller;
    // waves of 4, matching the pocket detection cadence
    for (let i = 0; i < working.length; i += 4) {
      if (controller.signal.aborted) return;
      await Promise.all(
        working.slice(i, i + 4).map(async (row, j) => {
          try {
            const res = await fetch(`/api/search/${kind}?q=${encodeURIComponent(row.line)}`, {
              signal: controller.signal,
            });
            if (!res.ok) throw new Error("search failed");
            const hits: SearchHit[] = await res.json();
            const best = pickBestHit(row.line, hits);
            working[i + j] = best
              ? { line: row.line, state: "matched", hit: best }
              : { line: row.line, state: "as-typed" };
          } catch {
            if (!controller.signal.aborted) working[i + j] = { line: row.line, state: "as-typed" };
          }
        })
      );
      if (controller.signal.aborted) return;
      setRows([...working]);
    }
    if (controller.signal.aborted) return;
    abortRef.current = null;
    await save(working, skipped);
  };

  const lineCount = parsePastedList(text).lines.length;

  return (
    <BottomSheet open={open} onClose={close} ariaLabel="Paste a list in">
      {rows === null ? (
        <div>
          <h2 className={sheetTitle}>Paste your list in</h2>
          <p className="mt-1 text-[0.92rem] text-brown">
            Straight from Notes or anywhere. One little thing per line.
          </p>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={"Dune\nPast Lives\nHeat…"}
            className={`mt-4 ${textareaField}`}
            aria-label="Pasted list"
          />
          {truncated && (
            <p className="mt-2 text-[0.82rem] font-semibold text-brown">
              {IMPORT_MAX_LINES} at a time for now, paste the rest after ✨
            </p>
          )}
          <Button block size="lg" onClick={() => void start()} disabled={lineCount === 0} className="mt-4">
            {lineCount > 0 ? `Tuck ${lineCount} in ✨` : "Tuck them in ✨"}
          </Button>
        </div>
      ) : (
        <div>
          <h2 className={sheetTitle}>Finding your things…</h2>
          <p className="mt-1 text-[0.92rem] text-brown">Covers appear as we find them.</p>
          <div className="mt-4 flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
            {rows.map((row) => (
              <div key={row.line} className="flex items-center gap-3 rounded-xl bg-cream-deep/40 p-2">
                <div className="w-11 shrink-0">
                  {row.state === "matched" ? (
                    <Cover
                      item={{ id: row.hit.sourceId, type: kind, title: row.hit.title, subtitle: row.hit.subtitle, seed: row.line, imageUrl: row.hit.imageUrl }}
                      rounded="rounded-md"
                      className="ring-1 ring-ink/8"
                    />
                  ) : row.state === "waiting" ? (
                    <SoftDotLoader />
                  ) : (
                    <span aria-hidden className="grid h-11 place-items-center text-lg">✨</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[0.95rem] font-semibold text-ink">
                    {row.state === "matched" ? row.hit.title : row.line}
                  </p>
                  {row.state === "matched" && row.hit.subtitle && (
                    <p className="text-[0.8rem] font-medium text-brown">{row.hit.subtitle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
```

Adjust to reality where the file differs (e.g. `SoftDotLoader` import path, `useStoreActions` vs `useStore`, `textareaField` export) — mirror how `add-item-modal.tsx` imports the same things. The `truncated` flag should be computed live from the current text (derive it next to `lineCount`, not only in `start`) — implementer: derive both from one `parsePastedList(text)` call per render.

- [ ] **Step 2: Entry points** in `app/app/(main)/list/[id]/page.tsx`

- Lazy import next to ListDnd: `const ImportSheet = dynamic(() => import("@/components/import-sheet").then((m) => m.ImportSheet), { ssr: false });`
- Local state: `const [importOpen, setImportOpen] = useState(false);` and render `{importOpen && <ImportSheet list={list} open={importOpen} onClose={() => setImportOpen(false)} />}` near the page root (after the main content, matching how other conditional overlays mount). Note `list` must be non-null there — mount below the early return.
- ⋯ menu (after "Edit list"): `{ label: "Paste a list in", onSelect: () => setImportOpen(true) },`
- First EmptyState action: keep the primary button, add beneath it a quiet text button:

```tsx
            action={
              <div className="flex flex-col items-center gap-2">
                <Button size="sm" onClick={() => openItemSheet(list.id)}>
                  Add the first little thing
                </Button>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className={`rounded-pill text-[0.86rem] font-bold text-brown ${focusRing}`}
                >
                  or paste a whole list in ›
                </button>
              </div>
            }
```

(Import `focusRing` from `@/lib/a11y` if not already imported in the page.)

- [ ] **Step 3: Gates** — lint 0, vitest, build.

- [ ] **Step 4: Commit** — `feat(import): paste-a-list sheet with auto-matching covers`

---

### Task 4: OG social card

**Files:**
- Create: `app/opengraph-image.tsx`
- Modify: `app/layout.tsx` (metadata: openGraph + twitter)

- [ ] **Step 1:** `app/opengraph-image.tsx` using `next/og` `ImageResponse`, 1200×630, `export const alt/size/contentType`. Design: warm cream ground (`#FFF8EF`), ink text (`#463C33`-ish, match globals), left side the wordmark "Little Lists" in a big serif (load Fraunces: fetch the ttf from Google Fonts inside the route and pass via `fonts` option; if the fetch pattern is awkward at build, system `Georgia, serif` fallback is acceptable — note which shipped) + tagline "remember what you love and what they love", right side a rotated 3-card cover-stack motif drawn with plain divs (rounded rectangles in three theme pastels: blush `#F7D6D0`-family, sage, sky — sample real values from globals.css theme hues), soft shadows. No remote images, no external assets. Read the Next docs page `node_modules/next/dist/docs/01-app/03-api-reference/13-file-conventions/01-metadata/opengraph-image.mdx` (or nearest match) for the exact export contract before writing.
- [ ] **Step 2:** In `app/layout.tsx` metadata, add `openGraph: { title, description, siteName: "Little Lists", type: "website" }` and `twitter: { card: "summary_large_image" }` (image URLs are wired automatically by the file convention).
- [ ] **Step 3:** Verify: `npm run build`, then `npm run dev` + `curl -s -o /tmp/og.png -w "%{http_code}" http://localhost:3000/opengraph-image` → 200, and view the png (Read tool) — brand check: cream/ink/Fraunces-or-serif, no dark-mode drift, no em dashes in copy.
- [ ] **Step 4:** Gates + commit — `feat(landing): opengraph social card`

---

### Task 5: Live verification, final review, merge

- [ ] `verify`-skill live pass per the spec's Verification section (12-line movie paste with bullets/numbers from Notes-style text; food paste; duplicate skipping; 60-line cap message; Escape aborts; both entry points; batch Undo; OG image renders).
- [ ] Check analytics rows: `feature_used paste_import` + `item_created flow=import`.
- [ ] Final whole-branch review (most capable model) with review package from the branch base; fix wave if needed.
- [ ] Gates, FF-merge to main. Push + production deploy only on user instruction.

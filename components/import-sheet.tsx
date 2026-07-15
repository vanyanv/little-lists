"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CreateItemInput } from "@/lib/actions";
import type { List } from "@/lib/types";
import { captureStatusFor } from "@/lib/types";
import { parsePastedList, pickBestHit, IMPORT_MAX_LINES } from "@/lib/import";
import { isDuplicateTitle } from "@/lib/sort";
import type { SearchHit } from "@/lib/search/types";
import { useStoreActions } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { useHydrated } from "@/lib/use-hydrated";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { Cover } from "./cover";
import { CoverSkeleton } from "./skeletons";
import { sheetTitle, textareaField } from "@/lib/field";

type RowState =
  | { line: string; state: "waiting" }
  | { line: string; state: "matched"; hit: SearchHit }
  | { line: string; state: "as-typed" };

export function ImportSheet({ list, open, onClose }: { list: List; open: boolean; onClose: () => void }) {
  const { importItems, deleteItem } = useStoreActions();
  const { showToast } = useUi();
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<RowState[] | null>(null); // null = compose step
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // unmount = dismiss = abort: browser/gesture back can unmount without close(), which would
  // otherwise let start()'s closure keep matching and save onto whatever page the user landed on
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const kind = list.kind;
  const searchable = kind === "movie" || kind === "book" || kind === "music";

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRows(null);
    setText("");
    setBusy(false);
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
      // importItems never returns null on success — a thrown error is the only
      // failure signal, caught below — so `created` is always the saved array here.
      const skippedNote = skipped > 0 ? ` (${skipped} already here)` : "";
      showToast(`Tucked ${created.length} into ${list.title} ✨${skippedNote}`, {
        action: {
          label: "Undo",
          onAction: () => {
            void Promise.allSettled(created.map((item) => deleteItem(list.id, item.id))).then((results) => {
              const failed = results.filter((r) => r.status === "rejected").length;
              if (failed > 0)
                showToast(
                  failed === 1
                    ? "One wouldn't undo. Give it a tap to remove it 🌿"
                    : `${failed} wouldn't undo. Give those a tap to remove them 🌿`
                );
            });
          },
        },
      });
    } catch {
      setRows(null); // back to compose with the paste intact for a retry
      setBusy(false);
      showToast("That didn't save. Let's try again 🌿");
    }
  };

  const start = async () => {
    if (busy) return;
    setBusy(true);
    const parsed = parsePastedList(text);
    // lines already in the list are skipped automatically, reported in the toast
    const fresh = parsed.lines.filter((l) => !isDuplicateTitle(l, list.items));
    const skipped = parsed.lines.length - fresh.length;
    if (fresh.length === 0) {
      setBusy(false); // nothing to save, no compose→save round-trip is starting
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

  const parsedNow = parsePastedList(text);
  const lineCount = parsedNow.lines.length;
  const truncated = parsedNow.truncated;

  // This sheet is mounted inside the list page, which renders inside
  // app-shell's <main class="relative z-[1] …">. That z-index creates a
  // stacking context that traps this sheet's fixed z-50 below it, so the
  // root-level bottom nav (fixed z-30) paints over the sheet's lower region.
  // Portal to document.body so it competes in the root stacking context,
  // same as the other sheets (pocket, add-item) which are mounted in
  // app-shell outside main and never had this problem.
  if (!hydrated) return null;

  return createPortal(
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
          <Button block size="lg" onClick={() => void start()} disabled={lineCount === 0 || busy} className="mt-4">
            {busy ? "Tucking in…" : lineCount > 0 ? `Tuck ${lineCount} in ✨` : "Tuck them in ✨"}
          </Button>
        </div>
      ) : (
        <div>
          <h2 className={sheetTitle}>Finding your things…</h2>
          <p className="mt-1 text-[0.92rem] text-brown">Covers appear as we find them.</p>
          {/* the match stream is visual (covers fading in) — narrate it for screen readers */}
          <p role="status" aria-live="polite" className="sr-only">
            {(() => {
              const settled = rows.filter((r) => r.state !== "waiting").length;
              return settled < rows.length
                ? `Found ${settled} of ${rows.length} so far`
                : `All ${rows.length} found, tucking them in`;
            })()}
          </p>
          <div className="mt-4 flex max-h-[50dvh] flex-col gap-2 overflow-y-auto overscroll-contain">
            {rows.map((row, i) => (
              <div key={row.line} className="flex items-center gap-3 rounded-xl bg-cream-deep/40 p-2">
                <div className="w-11 shrink-0">
                  {row.state === "matched" ? (
                    <Cover
                      item={{ id: row.hit.sourceId, type: kind, title: row.hit.title, subtitle: row.hit.subtitle, seed: row.line, imageUrl: row.hit.imageUrl }}
                      rounded="rounded-md"
                      className="ring-1 ring-ink/8"
                    />
                  ) : row.state === "waiting" ? (
                    <CoverSkeleton delay={(i % 6) * 0.14} />
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
    </BottomSheet>,
    document.body
  );
}

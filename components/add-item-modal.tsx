"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import type { CreateItemInput } from "@/lib/actions";
import { useUi, type ScrapRef } from "@/lib/ui";
import {
  ITEM_TYPE_META,
  TEMPLATE_META,
  statusesForList,
  captureStatusFor,
  type ItemType,
  type List,
  type ListTemplate,
  type StatusId,
} from "@/lib/types";
import type { SearchHit } from "@/lib/search/types";
import { isDuplicateTitle } from "@/lib/sort";
import { useComboboxNav } from "@/lib/use-combobox-nav";
import { themeClass } from "@/lib/visual";
import { staggerContainer, riseItem, softSpring, tap } from "@/lib/motion";
import { focusRing } from "@/lib/a11y";
import { inputPrimary, inputField, textareaField, sheetTitle, sheetTitleSm } from "@/lib/field";
import { Button } from "./button";
import { BottomSheet } from "./bottom-sheet";
import { EmojiPicker } from "./emoji-picker";
import { ResultListSkeleton } from "./skeletons";
import { Cover } from "./cover";
import { StatusPill } from "./status-pill";
import { AnimatedCategoryIcon } from "./icons/animated-category-icon";
import { LittleIcon } from "./icons/little-icon";
import { StickerBadge } from "./icons/sticker-badge";
import { PersonPicker } from "./person-picker";

const TYPES: ItemType[] = ["movie", "book", "music", "food", "place", "custom"];
const EMOJI_CHOICES = ["✨", "🍜", "🍵", "📍", "🎁", "🌷", "🍔", "☕", "🍄", "🌿", "🍷", "🎧", "💡", "🔖", "🧁", "🍿", "🎟️", "🌸"];

type Step = "compose" | "details";

export function AddItemModal() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "item";
  const presetListId = open ? sheet.listId : undefined;
  const scrap = open ? sheet.scrap : undefined;

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Add a little thing">
      {open && (
        <AddItemFlow
          key={presetListId ?? scrap?.id ?? "home"}
          presetListId={presetListId}
          scrap={scrap}
          onClose={closeSheet}
        />
      )}
    </BottomSheet>
  );
}

function AddItemFlow({
  presetListId,
  scrap,
  onClose,
}: {
  presetListId?: string;
  scrap?: ScrapRef;
  onClose: () => void;
}) {
  const { lists, people, addItem, addList, addPerson, fileScrap, deleteItem, fireCelebration } = useStore();
  const { showToast, openConfirm, confirm } = useUi();
  const presetList = lists.find((l) => l.id === presetListId);

  const [step, setStep] = useState<Step>("compose");
  const [type, setType] = useState<ItemType>(presetList?.kind ?? scrap?.kind ?? "movie");
  const [query, setQuery] = useState(scrap?.text ?? "");
  // namespaced by search kind so a stale pick can never highlight a
  // colliding sourceId after a movie ↔ book ↔ music switch
  const [picked, setPicked] = useState<string | null>(null);

  // chosen thing
  const [title, setTitle] = useState(scrap?.text ?? "");
  const [subtitle, setSubtitle] = useState("");
  // gift lists link to a person; personId is source of truth, subtitle mirrors the name
  const [personId, setPersonId] = useState<string | undefined>(undefined);
  const [seed, setSeed] = useState("");
  const [emoji, setEmoji] = useState("✨");

  // details
  const [targetListId, setTargetListId] = useState<string | undefined>(presetListId);
  const [status, setStatus] = useState<StatusId | undefined>(undefined);
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  const meta = ITEM_TYPE_META[type];
  const template: ListTemplate = presetList?.template ?? (type as ListTemplate);
  const tmeta = TEMPLATE_META[template];
  const statuses = presetList ? statusesForList(presetList) : tmeta.statuses;

  // the adaptive extra section follows where the item is actually being saved,
  // so filing a scrap into a gift list surfaces the "who's it for?" picker too.
  const targetList = lists.find((l) => l.id === targetListId);
  const effectiveTemplate: ListTemplate = targetList?.template ?? template;
  const effectiveMeta = TEMPLATE_META[effectiveTemplate];
  const personField = effectiveMeta.personField ?? false;
  // derive, never store-through: a non-gift destination can never leak a stale link
  const effectivePersonId = personField ? personId : undefined;
  const searchable = meta.searchable;
  const searchKind = type === "movie" || type === "book" || type === "music" ? type : null;

  // Search results settle as one atom keyed by (kind, term). Everything the
  // UI needs — results, in-flight, error — derives from how that key compares
  // to the current input, so no effect ever resets state by hand: an empty
  // box or a kind switch clears instantly, while stale same-kind hits stay
  // visible (dimmed) until the next response lands.
  const [settled, setSettled] = useState<{
    kind: string;
    term: string;
    hits: SearchHit[];
    error: boolean;
  }>({ kind: "", term: "", hits: [], error: false });
  const term = query.trim();
  const settledCurrent = settled.kind === searchKind && settled.term === term;
  const results = searchKind && term && settled.kind === searchKind ? settled.hits : [];
  const searching = Boolean(searchKind && term) && !settledCurrent;
  const searchError = settledCurrent && settled.error;
  // carry the picked hit's cover + metadata into save()
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [pickedMeta, setPickedMeta] = useState<Record<string, unknown> | undefined>(undefined);

  useEffect(() => {
    if (!searchKind) return;
    const term = query.trim();
    if (!term) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/${searchKind}?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("search failed");
        const hits: SearchHit[] = await res.json();
        setSettled({ kind: searchKind, term, hits, error: false });
      } catch {
        if (!controller.signal.aborted) {
          setSettled({ kind: searchKind, term, hits: [], error: true });
        }
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query, searchKind]);

  // auto-pick a sensible destination list when type changes (scrap/global entry).
  // Deferred commits/undos churn `lists` identity mid-flow — never clobber a
  // still-valid manual choice; re-pick only on a type switch or a dead selection.
  const lastAutoPickType = useRef<ItemType | null>(null);
  useEffect(() => {
    if (presetListId) return;
    const selectionAlive = targetListId != null && lists.some((l) => l.id === targetListId);
    if (lastAutoPickType.current === type && selectionAlive) return;
    lastAutoPickType.current = type;
    const match = lists.find((l) => l.kind === type);
    setTargetListId(match?.id ?? lists[0]?.id);
  }, [type, presetListId, lists, targetListId]);

  const pickResult = (r: SearchHit) => {
    if (searching) return; // stale hit from the superseded query — ignore
    setPicked(`${searchKind}:${r.sourceId}`);
    setTitle(r.title);
    setSubtitle(r.subtitle);
    setSeed(r.title);
    setImageUrl(r.imageUrl);
    setPickedMeta(r.meta);
    setStatus(statuses[0]);
    // let the chosen row glow for a beat before sliding forward
    setTimeout(() => setStep("details"), 260);
  };

  const continueManual = (text?: string) => {
    const value = (text ?? (query || title)).trim();
    if (!value) return;
    setTitle(value);
    setSeed(value);
    setImageUrl(undefined);
    setPickedMeta(undefined);
    setStatus(statuses[0]);
    setStep("details");
  };

  const createTargetList = async (): Promise<List | null> => {
    if (creatingList) return null;
    setCreatingList(true);
    try {
      const t = template; // presetList?.template ?? (type as ListTemplate), already derived above
      const m = TEMPLATE_META[t];
      const created = await addList({ title: m.label, emoji: m.emoji, theme: m.theme, template: t, defaultView: m.defaultView });
      setTargetListId(created.id);
      return created;
    } catch {
      showToast("That didn't save. Let's try again 🌿");
      return null;
    } finally {
      setCreatingList(false);
    }
  };

  // destTitle covers a just-created destination the stale `lists` closure can't name
  const persist = async (input: CreateItemInput, listId: string, destTitle?: string) => {
    if (scrap) {
      setSaving(true);
      // deferred file: optimistic now, one transaction on toast expiry, undo restores
      const listTitle = destTitle ?? lists.find((l) => l.id === listId)?.title ?? "your list";
      const handle = fileScrap(scrap.id, listId, input);
      onClose();
      showToast(`Filed into ${listTitle} ✨`, {
        action: { label: "Undo", onAction: handle.undo },
        onExpire: handle.commit,
      });
      return;
    }

    const wasEmpty = (lists.find((l) => l.id === listId)?.items.length ?? 0) === 0;
    setSaving(true);
    try {
      const created = await addItem(listId, input);
      // rare milestone: this list just came alive
      if (wasEmpty) fireCelebration("confetti");
      onClose();
      if (input.flow === "quick" && created) {
        const listTitle = destTitle ?? lists.find((l) => l.id === listId)?.title ?? "your list";
        showToast(`Saved to ${listTitle} ✨`, {
          action: { label: "Undo", onAction: () => void deleteItem(listId, created.id) },
        });
      } else {
        showToast("Saved to your little world ✨");
      }
    } catch {
      setSaving(false);
      setPicked(null); // a failed quick-pick save must not leave the results list permanently inert
      showToast("That didn't save. Let's try again 🌿");
    }
  };

  const saveItem = async (input: CreateItemInput, opts?: { listId?: string }) => {
    // a duplicate confirm is already open — don't re-detect and clobber its onConfirm
    // closure with this call's (e.g. a held Enter key repeating past the first detection).
    if (confirm) return;
    let listId = opts?.listId ?? targetListId ?? lists[0]?.id;
    let destTitle: string | undefined;
    // A quick save never shows its destination, so it must never land in a
    // wrong-kind list (the auto-pick's lists[0] fallback): match the kind, or
    // quietly start that list — the same move as the pocket chip. A brand-new
    // world (zero lists) gets its first list this way instead of a silent no-op.
    if (input.flow === "quick" && !presetListId && !opts?.listId) {
      if (saving || !input.title.trim()) return;
      const match = lists.find((l) => l.kind === type); // store order is pinned-first
      if (match) {
        listId = match.id;
        destTitle = match.title;
        input = { ...input, status: captureStatusFor(match.template) };
      } else {
        const created = await createTargetList();
        if (!created || !alive.current) {
          setPicked(null); // a failed create must not leave the results list inert
          return;
        }
        listId = created.id;
        destTitle = created.title;
        input = { ...input, status: captureStatusFor(template) };
      }
    }
    // guards direct quick-save callers (quickPick/quickManual); the details step's own
    // Save button is already disabled-gated on !title.trim(), so this reads as dead code there
    if (!listId || saving || !input.title.trim()) return;
    const targetItems = lists.find((l) => l.id === listId)?.items ?? [];
    if (isDuplicateTitle(input.title, targetItems)) {
      // clear any pending quick-pick now: the confirm sheet itself blocks re-taps on the
      // results list while it's open, and there's no cancel callback to clear this from
      // later, so it must not be left set regardless of how the confirm gets dismissed.
      setPicked(null);
      const finalInput = input;
      const finalListId = listId;
      openConfirm({
        title: "Already in this list",
        body: `"${input.title.trim()}" is already here. Add it again anyway?`,
        confirmLabel: "Add anyway",
        onConfirm: () => {
          void persist(finalInput, finalListId, destTitle);
        },
      });
      return;
    }
    void persist(input, listId, destTitle);
  };

  // save on first intent: a picked hit becomes an item immediately (the details
  // screen only appears when it has something essential to ask — see gift below)
  const quickPickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickPick = (r: SearchHit) => {
    if (searching || picked || confirm) return; // stale hit, or a pick is already pending, or a confirm sheet is open — ignore
    setPicked(`${searchKind}:${r.sourceId}`);
    // let the chosen row glow for a beat before the sheet slides away
    quickPickTimer.current = setTimeout(() => {
      quickPickTimer.current = null;
      void saveItem({
        type,
        title: r.title,
        subtitle: r.subtitle || undefined,
        status: captureStatusFor(effectiveTemplate),
        seed: r.title,
        imageUrl: r.imageUrl,
        meta: r.meta,
        flow: "quick",
      });
    }, 260);
  };

  // dismiss aborts the glow-save: AddItemFlow unmounts when the sheet closes
  // (it's keyed inside BottomSheet), so this cleanup cancels a pending quick
  // save when Escape/scrim/drag closes the sheet mid-glow. `alive` extends the
  // same abort across saveItem's awaited first-list create.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // StrictMode re-runs effects: the dev double-cleanup must not strand this false
    return () => {
      alive.current = false;
      if (quickPickTimer.current) clearTimeout(quickPickTimer.current);
    };
  }, []);

  const quickManual = (text: string) => {
    const value = text.trim();
    if (!value) return;
    void saveItem({
      type,
      title: value,
      status: captureStatusFor(effectiveTemplate),
      emoji: meta.aspect === "note" ? emoji : undefined,
      seed: value,
      flow: "quick",
    });
  };

  // Arrow keys walk the results while DOM focus stays in the input (WAI-ARIA
  // combobox). Only the quick flow participates: the gift flow's Enter keeps
  // its spec'd continue-with-typed-text behavior.
  const navEnabled = searchable && !personField && !searching && !picked && results.length > 0;
  const optionIds = results.map((r) => `add-item-opt-${searchKind}-${r.sourceId}`.replace(/\s+/g, "-"));
  const nav = useComboboxNav({
    ids: navEnabled ? optionIds : [],
    onSelect: (_id, i) => {
      const r = results[i];
      if (r) quickPick(r);
    },
    onEscape: () => {}, // BottomSheet already owns Escape-to-close
  });

  const save = () => {
    void saveItem({
      type,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      note: note.trim() || undefined,
      status,
      tags: tag.trim() ? [tag.trim()] : undefined,
      emoji: meta.aspect === "note" ? emoji : undefined,
      seed: seed || title,
      imageUrl,
      meta: pickedMeta,
      personId: effectivePersonId,
      flow: "detailed",
    });
  };

  return (
    <div className="pt-1">
      <AnimatePresence mode="wait" initial={false}>
        {step === "compose" && (
          <motion.div
            key="compose"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className={sheetTitle}>
              {presetList ? tmeta.addHeading(presetList.title) : "What little thing are we saving?"}
            </h2>
            <p className="mt-1 text-[0.92rem] text-brown">
              {presetList
                ? searchable
                  ? "Search a title, or tuck in your own."
                  : "Give it a name and a little icon."
                : "A film, a book, a place, a tiny obsession."}
            </p>

            <input
              autoFocus
              aria-label={searchable ? "Search a title" : "Give it a name"}
              role={searchable && !personField ? "combobox" : undefined}
              aria-expanded={searchable && !personField ? results.length > 0 : undefined}
              aria-controls={searchable && !personField ? "add-item-results" : undefined}
              aria-autocomplete={searchable && !personField ? "list" : undefined}
              aria-activedescendant={navEnabled ? nav.activeId : undefined}
              value={query || title}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!searchable) setTitle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (navEnabled) {
                  nav.onKeyDown(e); // arrows move the active option, Enter saves it
                  if (e.defaultPrevented) return;
                }
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (personField) {
                  if ((query || title).trim()) continueManual();
                  return;
                }
                if (searchable) {
                  // results>0 is handled by nav above; this is the no-match fallback
                  if (query.trim() && !searching && results.length === 0) quickManual(query);
                  return;
                }
                quickManual(query || title);
              }}
              placeholder={searchable ? "Search a title…" : "Give it a name…"}
              className={`mt-4 ${inputPrimary}`}
            />

            {/* Type picker for the list-less flow — reached when filing a scrap from the pocket. */}
            {!presetListId && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {TYPES.map((t) => {
                  const m = ITEM_TYPE_META[t];
                  const active = t === type;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setType(t)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[0.85rem] font-bold transition ${focusRing} ${
                        active ? "bg-ink text-cream shadow-soft" : "bg-cream-deep text-brown ring-1 ring-line/60"
                      }`}
                    >
                      <AnimatedCategoryIcon id={t} size={15} play={active} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}

            {searchable ? (
              <>
                <div className="mt-4 min-h-[8rem]">
                  {searching && results.length === 0 ? (
                    <ResultListSkeleton rows={4} aspect={meta.aspect === "square" ? "square" : "poster"} />
                  ) : (
                    <motion.div
                      id="add-item-results"
                      role="listbox"
                      aria-label="Search results"
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className={`flex flex-col gap-2 transition-opacity ${searching || picked ? "pointer-events-none opacity-60" : ""}`}
                    >
                      {results.map((r, i) => {
                        const chosen = picked === `${searchKind}:${r.sourceId}`;
                        const active = navEnabled && i === nav.activeIndex;
                        return (
                          <motion.button
                            key={r.sourceId}
                            id={optionIds[i]}
                            variants={riseItem}
                            type="button"
                            role="option"
                            aria-selected={chosen || active}
                            tabIndex={searching || picked ? -1 : undefined}
                            onClick={() => (personField ? pickResult(r) : quickPick(r))}
                            onPointerMove={() => {
                              // hover follows the virtual cursor so mouse and arrows never fight
                              if (navEnabled && nav.activeIndex !== i) nav.setActiveIndex(i);
                            }}
                            whileTap={tap}
                            animate={{ scale: chosen ? 1.015 : 1 }}
                            transition={{ ...softSpring }}
                            className={`flex items-center gap-3 rounded-xl p-2 text-left transition ${focusRing} ${
                              chosen
                                ? "bg-cream-deep ring-2 ring-ink/15"
                                : active
                                  ? "bg-cream-deep/70 ring-1 ring-ink/10"
                                  : "bg-cream-deep/40 hover:bg-cream-deep/70"
                            }`}
                          >
                            <div className="w-11 shrink-0">
                              <Cover
                                item={{ id: r.sourceId, type, title: r.title, subtitle: r.subtitle, seed: r.title, imageUrl: r.imageUrl }}
                                rounded="rounded-md"
                                className="ring-1 ring-ink/8"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-display text-[0.98rem] font-semibold text-ink">{r.title}</p>
                              <p className="text-[0.82rem] font-medium text-brown">{r.subtitle}</p>
                            </div>
                            {chosen && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={softSpring}
                                className="mr-1 text-ink"
                                aria-hidden
                              >
                                <LittleIcon name="check" size={15} />
                              </motion.span>
                            )}
                          </motion.button>
                        );
                      })}
                      {results.length === 0 && query.trim().length === 0 && (
                        <p className="px-1 py-6 text-center text-[0.9rem] text-brown">
                          Start typing to find it ✨
                        </p>
                      )}
                      {results.length === 0 && query.trim().length > 0 && !searching && (
                        <div className="flex flex-col items-center gap-3 px-1 py-6 text-center">
                          <p className="text-[0.9rem] text-brown">
                            {searchError
                              ? "Search is napping. Add it by hand below 🌿"
                              : "No match out there. Tuck it in by hand?"}
                          </p>
                          <Button
                            variant="soft"
                            size="md"
                            className="min-h-11"
                            onClick={() => (personField ? continueManual(query) : quickManual(query))}
                          >
                            Add &quot;{query.trim()}&quot; anyway
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
                {query.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => continueManual(query)}
                    disabled={Boolean(picked) || saving}
                    className={`mx-auto mt-3 block rounded-pill text-[0.86rem] font-bold text-brown disabled:opacity-50 ${focusRing}`}
                  >
                    add details first ›
                  </button>
                )}
              </>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">pick a little icon</p>
                <EmojiPicker choices={EMOJI_CHOICES} value={emoji} onChange={setEmoji} />
                <Button
                  block
                  size="lg"
                  onClick={() => (personField ? continueManual() : quickManual(query || title))}
                  disabled={!(query || title).trim() || saving}
                  className="mt-4"
                >
                  {personField ? "Continue" : "Save it ✨"}
                </Button>
                {!personField && (
                  <button
                    type="button"
                    onClick={() => continueManual()}
                    disabled={!(query || title).trim()}
                    className={`mx-auto mt-3 block rounded-pill text-[0.86rem] font-bold text-brown disabled:opacity-50 ${focusRing}`}
                  >
                    add details first ›
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {step === "details" && (
          <DetailsStep
            type={type}
            title={title}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            seed={seed}
            imageUrl={imageUrl}
            emoji={emoji}
            lists={lists}
            targetListId={targetListId}
            setTargetListId={presetListId ? undefined : setTargetListId}
            statuses={statuses}
            statusHeading={tmeta.statusHeading}
            extraField={effectiveMeta.extraField}
            personField={personField}
            people={people}
            addPerson={addPerson}
            personId={effectivePersonId}
            onPerson={(next) => {
              setPersonId(next.personId);
              setSubtitle(next.subtitle);
            }}
            status={status}
            setStatus={setStatus}
            note={note}
            setNote={setNote}
            tag={tag}
            setTag={setTag}
            saving={saving}
            onBack={() => setStep("compose")}
            onSave={save}
            onCreateList={presetListId ? undefined : createTargetList}
            creatingList={creatingList}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailsStep(props: {
  type: ItemType;
  title: string;
  subtitle: string;
  setSubtitle: (s: string) => void;
  seed: string;
  imageUrl?: string;
  emoji: string;
  lists: ReturnType<typeof useStore>["lists"];
  targetListId?: string;
  setTargetListId?: (id: string) => void;
  statuses: StatusId[];
  statusHeading: string;
  extraField?: { label: string; placeholder: string };
  personField: boolean;
  people: ReturnType<typeof useStore>["people"];
  addPerson: ReturnType<typeof useStore>["addPerson"];
  personId?: string;
  onPerson: (next: { personId?: string; subtitle: string }) => void;
  status?: StatusId;
  setStatus: (s: StatusId) => void;
  note: string;
  setNote: (s: string) => void;
  tag: string;
  setTag: (s: string) => void;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onCreateList?: () => void;
  creatingList?: boolean;
}) {
  const {
    type, title, subtitle, setSubtitle, seed, imageUrl, emoji, lists, targetListId, setTargetListId,
    statuses, statusHeading, extraField, personField, people, addPerson, personId, onPerson,
    status, setStatus, note, setNote, tag, setTag, saving, onBack, onSave,
    onCreateList, creatingList,
  } = props;
  const { showToast } = useUi();
  const isPoster = ITEM_TYPE_META[type].aspect !== "note";
  const targetList = lists.find((l) => l.id === targetListId);
  const themed = targetList ? themeClass(targetList.theme) : "";

  return (
    <motion.div
      key="details"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={themed}
    >
      <button
        type="button"
        onClick={onBack}
        className={`mb-3 flex items-center gap-1 rounded-pill text-[0.86rem] font-bold text-brown ${focusRing}`}
      >
        <span aria-hidden>‹</span> back
      </button>

      <div className="flex items-center gap-4">
        {isPoster ? (
          <div className="w-20 shrink-0">
            <Cover
              item={{ id: "preview", type, title, subtitle, seed, imageUrl }}
              className="shadow-soft ring-1 ring-ink/8"
            />
          </div>
        ) : (
          <StickerBadge emoji={emoji} size={80} tone="wash" />
        )}
        <div className="min-w-0">
          <h2 className={sheetTitleSm}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-[0.9rem] font-semibold text-brown">{subtitle}</p>}
        </div>
      </div>

      {setTargetListId && (
        <div className="mt-5">
          <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">save into</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {lists.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === targetListId}
                onClick={() => setTargetListId(l.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-2 text-[0.82rem] font-bold transition ${focusRing} ${
                  l.id === targetListId ? "bg-ink text-cream" : "bg-cream-deep text-brown ring-1 ring-line/60"
                }`}
              >
                <StickerBadge emoji={l.emoji} size={22} rounded="rounded-md" className="shadow-none" />
                {l.title}
              </button>
            ))}
            {onCreateList && (
              <button
                type="button"
                onClick={onCreateList}
                disabled={creatingList}
                className={`flex shrink-0 items-center gap-1.5 rounded-pill border border-dashed border-line px-3 py-2 text-[0.82rem] font-bold text-brown transition ${focusRing} disabled:opacity-50`}
              >
                ＋ a new little list
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">{statusHeading}</p>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`-my-0.5 flex min-h-11 items-center rounded-pill transition ${focusRing} ${status === s ? "" : "opacity-55 hover:opacity-90"}`}
            >
              <StatusPill status={s} selected={status === s} />
            </button>
          ))}
        </div>
      </div>

      {personField ? (
        <div className="mt-5">
          <PersonPicker
            people={people}
            personId={personId}
            subtitle={subtitle}
            onChange={onPerson}
            addPerson={addPerson}
            label={extraField?.label ?? "Who's it for?"}
            notePlaceholder={extraField?.placeholder ?? "for the office gift exchange…"}
            onCreateError={() => showToast("That didn't save. Let's try again 🌿")}
          />
        </div>
      ) : extraField ? (
        <div className="mt-5">
          <label htmlFor="add-item-extra" className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">{extraField.label}</label>
          <input
            id="add-item-extra"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder={extraField.placeholder}
            className={inputField}
          />
        </div>
      ) : null}

      <div className="mt-5">
        <label htmlFor="add-item-note" className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a little note</label>
        <textarea
          id="add-item-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note so future you remembers why ✨"
          className={textareaField}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="add-item-tag" className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a tag (optional)</label>
        <input
          id="add-item-tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="like a person, a mood, a someday…"
          className={inputField}
        />
      </div>

      <Button block size="lg" onClick={onSave} disabled={!title.trim() || saving} className="mt-6">
        {saving ? "Saving…" : "Save it to your little world"}
      </Button>
    </motion.div>
  );
}
